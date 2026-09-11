import { ethers } from 'ethers';
import { config } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { getErrorCode, getErrorMessage } from '../utils/errors.js';
import { LockLostError } from './queue-errors.js';

// Learning Progress ABI (minimal - only what we need)
const LEARNING_PROGRESS_ABI = [
  'function recordCompletion(uint256 _moduleId, uint256 _score, string memory _moduleTopic) external',
  'event ModuleCompleted(address indexed user, uint256 indexed moduleId, uint256 score, uint256 timestamp, string moduleTopic)',
];

export interface BlockchainReceipt {
  hash: string;
  blockNumber: number;
  gasUsed: string;
}

/**
 * Everything needed to wait for — or replace — a broadcast transaction,
 * without holding on to the ethers `TransactionResponse`. The queue writes
 * the nonce and the hash to the database BEFORE the transaction reaches the
 * node, which is what makes the on-chain write survive both a crash and a
 * lost acknowledgement. The same order (sign → journal → broadcast) is used
 * for replace-by-fee replacements: the replacement hash is journaled while
 * the replacement exists only as a signature, never after the node has it.
 */
export interface SentTransaction {
  hash: string;
  nonce: number;
  data: string;
  to: string;
  /** null = let ethers estimate it when re-broadcasting. */
  gasLimit: bigint | null;
  maxFeePerGas: bigint | null;
  maxPriorityFeePerGas: bigint | null;
}

/**
 * A transaction that is signed and therefore has a final hash, but that no
 * node has seen yet.
 *
 * The whole point of the type: signing is local, so the hash exists before
 * the network does. That is what lets the caller journal the hash it is
 * about to broadcast rather than the hash it hopes to hear back about.
 */
export interface PreparedTransaction extends SentTransaction {
  /** The signed transaction, ready for `eth_sendRawTransaction`. */
  raw: string;
}

/** The journal a reclaimed record carries into `recoverCompletion`. */
export interface CompletionJournal {
  nonce: number;
  /** Every hash broadcast on that nonce: the original and any fee bump. */
  hashes: string[];
  moduleId: number;
  score: number;
  topic: string;
}

/**
 * Called with each replacement hash the service signs, BEFORE the signed
 * transaction reaches the node. The queue appends the hash to the journal
 * while the replacement is still only a signature, so a lost acknowledgement
 * never leaves an in-flight hash that recovery cannot look up — and if that
 * fenced journal write reports the lock lost (LockLostError), the service
 * throws instead of broadcasting anything on a nonce that is not ours any
 * more.
 */
export type OnReplacementHash = (hash: string) => Promise<void>;

/**
 * Error thrown when retrying the same transaction can never succeed
 * (e.g. the contract reverted). The blockchain queue worker marks the
 * record `failed_permanent` immediately instead of burning retries.
 */
export class NonRetryableBlockchainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableBlockchainError';
  }
}

/** Percentage applied to the original fees when replacing a stuck tx. */
const FEE_BUMP_PERCENT = 125n;

/**
 * Web3 Service for blockchain interactions.
 * 
 * Features:
 * - Records module completions on Ethereum blockchain
 * - Verifies Web3 signatures for authentication
 * - Manages gas fees and transaction confirmations
 * 
 * Smart Contract: LearningProgress (Sepolia testnet)
 * 
 * @class Web3Service
 */
export class Web3Service {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  constructor() {
    // Initialize provider
    this.provider = new ethers.JsonRpcProvider(config.ETHEREUM_RPC_URL);

    // Initialize wallet
    this.wallet = new ethers.Wallet(config.PRIVATE_KEY, this.provider);

    // Initialize contract
    this.contract = new ethers.Contract(
      config.CONTRACT_ADDRESS,
      LEARNING_PROGRESS_ABI,
      this.wallet
    );

    logger.info('Web3 Service initialized');
    logger.info(`Contract address: ${config.CONTRACT_ADDRESS}`);
    logger.info(`Wallet address: ${this.wallet.address}`);
  }

  /** Address of the custodial wallet that pays for gas. */
  get walletAddress(): string {
    return this.wallet.address;
  }

  /** Current ETH balance (wei) of the custodial wallet. */
  async getWalletBalance(): Promise<bigint> {
    return this.provider.getBalance(this.wallet.address);
  }

  /**
   * The nonce the next broadcast from this wallet would consume.
   *
   * Read with `pending`, so a transaction already in the mempool is counted
   * and two sends in a row do not collide on one nonce.
   *
   * Exists so the caller can fix the nonce before signing, which is what
   * lets the signature, the journal and the broadcast all describe one
   * transaction.
   */
  async nextNonce(): Promise<number> {
    return this.provider.getTransactionCount(this.wallet.address, 'pending');
  }

  /**
   * Sign a `recordCompletion` transaction WITHOUT sending it anywhere.
   *
   * Sending is three steps, not one, and this is the first: sign locally,
   * journal, broadcast, wait. Splitting signing from broadcasting is what
   * removes the last way this pipeline could record a completion twice.
   *
   * The reason is that a signed transaction already has its final hash —
   * the hash IS the signature over the fully specified transaction, so it
   * cannot change afterwards and no network round trip is needed to learn
   * it. Letting `contract.recordCompletion(...)` sign and broadcast in one
   * call means the hash only comes back with the acknowledgement, and an
   * acknowledgement can be lost: a socket reset, an RPC timeout or a
   * gateway 502 leaves the node holding a transaction whose hash the caller
   * never learned. Signing first means the caller writes down the hash it
   * is *about to* broadcast, so even a broadcast that seems to have failed
   * leaves a row naming the exact transaction to go looking for.
   *
   * @param nonce the nonce this transaction must consume, from
   *              {@link nextNonce}. Fixed here rather than filled in by
   *              ethers at send time, so the signature, the journal and the
   *              broadcast all describe the same transaction
   */
  async prepareCompletion(
    moduleId: number,
    score: number,
    topic: string,
    nonce: number
  ): Promise<PreparedTransaction> {
    logger.info(`Recording completion on blockchain: Module ${moduleId}, Score ${score}`);

    try {
      // Check wallet balance
      const balance = await this.getWalletBalance();
      logger.debug(`Wallet balance: ${ethers.formatEther(balance)} ETH`);

      if (balance === 0n) {
        throw new Error('Wallet has no funds for gas fees');
      }

      const call = await this.contract.recordCompletion.populateTransaction(
        moduleId,
        score,
        topic
      );
      // Fills gas, fees, chainId and type from the network; the nonce is
      // ours and is passed through untouched.
      const populated = await this.wallet.populateTransaction({ ...call, nonce });
      const raw = await this.wallet.signTransaction(populated);
      const hash = ethers.Transaction.from(raw).hash;

      if (!hash) {
        // Unreachable for a signed transaction, and worth failing loudly
        // rather than journaling an empty hash if ethers ever changes.
        throw new Error('Signed transaction has no hash');
      }

      logger.debug(`Transaction signed: ${hash} (nonce ${nonce})`);

      return {
        raw,
        hash,
        nonce,
        data: populated.data ?? call.data,
        to: (populated.to as string | null) ?? config.CONTRACT_ADDRESS,
        gasLimit: this.asBigInt(populated.gasLimit),
        maxFeePerGas: this.asBigInt(populated.maxFeePerGas),
        maxPriorityFeePerGas: this.asBigInt(populated.maxPriorityFeePerGas),
      };
    } catch (error) {
      throw this.toDomainError(error);
    }
  }

  /**
   * Hand an already-signed transaction to the node.
   *
   * Returns the same description {@link prepareCompletion} produced: the
   * hash was fixed by the signature, so nothing the node says can change
   * it, and a failure here is a failure to *deliver* a transaction that
   * already exists and may well have arrived anyway.
   */
  async broadcastCompletion(prepared: PreparedTransaction): Promise<SentTransaction> {
    try {
      const sent = await this.provider.broadcastTransaction(prepared.raw);
      logger.debug(`Transaction broadcast: ${sent.hash} (nonce ${prepared.nonce})`);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { raw: _raw, ...description } = prepared;
      return description;
    } catch (error) {
      throw this.toDomainError(error);
    }
  }

  /** Normalise the numeric shapes ethers may return for a populated field. */
  private asBigInt(value: unknown): bigint | null {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number' || typeof value === 'string') return BigInt(value);
    return null;
  }

  /**
   * Wait for a transaction handed to the node by `broadcastCompletion`.
   *
   * Stuck-transaction strategy (unchanged by the send/wait split):
   * 1. Wait up to `timeoutMs` for 1 confirmation.
   * 2. If it doesn't confirm in time, sign a replacement on the SAME nonce
   *    with fees bumped by 25% (replace-by-fee) and wait again. If the
   *    original mines in the meantime, ethers reports TRANSACTION_REPLACED /
   *    NONCE_EXPIRED and we recover the original receipt.
   * 3. If the replacement also times out, throw a retryable error — the
   *    queue worker retries later, and the retry goes through
   *    `recoverCompletion`, which reuses the still-stuck nonce.
   *
   * `onReplacement` is invoked with the replacement hash BEFORE the signed
   * replacement is handed to the node, so the caller's journal always knows
   * every hash sent on this nonce before any of them is in flight.
   *
   * Throws NonRetryableBlockchainError for contract reverts
   * (CALL_EXCEPTION): retrying the exact same call can never succeed.
   */
  async waitForCompletion(
    sent: SentTransaction,
    timeoutMs: number = 90_000,
    onReplacement?: OnReplacementHash
  ): Promise<BlockchainReceipt> {
    try {
      let receipt = await this.waitForHash(sent.hash, timeoutMs);

      if (!receipt) {
        logger.warn(
          `Transaction ${sent.hash} not confirmed after ${timeoutMs}ms — replacing with fee bump`,
          { nonce: sent.nonce }
        );
        receipt = await this.replaceWithFeeBump(sent, timeoutMs, onReplacement);
      }

      if (!receipt) {
        // Still stuck after the replacement attempt: surface a retryable
        // error. The queue worker will try again later.
        throw new Error('Transaction not confirmed in time (will be retried)');
      }

      return this.toBlockchainReceipt(receipt);
    } catch (error) {
      throw this.toDomainError(error);
    }
  }

  /**
   * Resolve a record whose transaction was already broadcast (the queue
   * journaled a nonce for it) but whose outcome we never recorded —
   * typically a row reclaimed after the worker was killed mid-wait.
   *
   * This is the half of the design that makes the pipeline exactly-once:
   * a reclaimed record NEVER allocates a fresh nonce, because a fresh
   * nonce next to a still-pending journaled one is precisely how the
   * append-only contract ends up with two records for one completion.
   *
   * 1. Any journaled hash with a receipt decides the outcome: status 1 →
   *    confirmed, status 0 → permanent failure (the same call reverts
   *    again).
   * 2. No receipt anywhere, but the account nonce has moved past ours →
   *    something we did not journal consumed the nonce. Refuse to send;
   *    an operator has to look at the wallet.
   * 3. Otherwise the transaction is still pending (or was dropped):
   *    re-broadcast the same calldata on the same nonce with bumped fees,
   *    which either replaces it or takes over the slot it vacated.
   *
   * A journal carrying a nonce and no hashes at all is handled rather than
   * rejected. The queue no longer produces one — it journals the hash it
   * signed before broadcasting — but a row written by an older build, or a
   * `blockchain_sent_hashes` that failed to parse, arrives here looking
   * exactly like that, and the safe reading is the same one: nonce
   * untouched means nothing of ours was sent and step 3 uses it, nonce
   * consumed means step 2 parks the record.
   *
   * Step 2 is the only path that ends in a human, and journaling the hash
   * before the broadcast is what keeps it rare. It now means the nonce was
   * consumed by a transaction this row never signed — someone else spending
   * from the custodial wallet — which is a genuine "look at the wallet"
   * event rather than a lost acknowledgement misfiling itself.
   */
  async recoverCompletion(
    journal: CompletionJournal,
    timeoutMs: number = 90_000,
    onReplacement?: OnReplacementHash
  ): Promise<BlockchainReceipt> {
    try {
      logger.info(
        `Recovering in-flight completion on nonce ${journal.nonce} ` +
          `(${journal.hashes.length} journaled hash(es))`
      );

      // 1. Did any hash we sent on this nonce already mine?
      for (const hash of journal.hashes) {
        const receipt = await this.provider.getTransactionReceipt(hash);
        if (!receipt) continue;
        if (receipt.status === 1) {
          logger.info(`Recovered mined transaction ${hash} for nonce ${journal.nonce}`);
          return this.toBlockchainReceipt(receipt);
        }
        // Mined and reverted: resending the identical call is pointless.
        throw new NonRetryableBlockchainError(`Contract reverted on-chain: ${hash}`);
      }

      // 2. Nothing of ours mined. If the account nonce is already past
      //    this one, some other transaction consumed it — possibly a
      //    completion whose journal write never landed. Sending again
      //    would risk the duplicate this whole design exists to prevent.
      const minedNonces = await this.provider.getTransactionCount(
        this.wallet.address,
        'latest'
      );
      if (minedNonces > journal.nonce) {
        throw new NonRetryableBlockchainError(
          `Nonce ${journal.nonce} was consumed by a transaction that is not in ` +
            `the journal (${journal.hashes.join(', ') || 'no hashes'}) — refusing ` +
            `to resend. Manual check of wallet ${this.wallet.address} required ` +
            `before this record can be retried.`
        );
      }

      // 3. Still pending or dropped: take over the nonce with the same
      //    calldata and bumped fees.
      const pending = await this.pendingBroadcast(journal);
      const receipt = await this.replaceWithFeeBump(pending, timeoutMs, onReplacement);

      if (!receipt) {
        throw new Error('Transaction not confirmed in time (will be retried)');
      }

      return this.toBlockchainReceipt(receipt);
    } catch (error) {
      throw this.toDomainError(error);
    }
  }

  /**
   * Rebuild the `SentTransaction` for a journaled nonce so it can be
   * re-broadcast. Fees and gas come from the still-pending transaction
   * when the node has it; otherwise the tx was dropped and current
   * market fees are used (gas is left to ethers to estimate).
   */
  private async pendingBroadcast(journal: CompletionJournal): Promise<SentTransaction> {
    const lastHash = journal.hashes[journal.hashes.length - 1] ?? '';
    const stuck = lastHash ? await this.provider.getTransaction(lastHash) : null;
    const feeData = stuck ? null : await this.provider.getFeeData();

    return {
      hash: lastHash,
      nonce: journal.nonce,
      data: this.contract.interface.encodeFunctionData('recordCompletion', [
        journal.moduleId,
        journal.score,
        journal.topic,
      ]),
      to: config.CONTRACT_ADDRESS,
      gasLimit: stuck?.gasLimit ?? null,
      maxFeePerGas: stuck?.maxFeePerGas ?? feeData?.maxFeePerGas ?? null,
      maxPriorityFeePerGas:
        stuck?.maxPriorityFeePerGas ?? feeData?.maxPriorityFeePerGas ?? null,
    };
  }

  /** Shape an ethers receipt for the queue, rejecting reverted ones. */
  private toBlockchainReceipt(receipt: ethers.TransactionReceipt): BlockchainReceipt {
    if (receipt.status === 0) {
      // `tx.wait()` raises CALL_EXCEPTION for this, but receipts read
      // straight from the provider (recovery, replacement races) reach
      // here unchecked.
      throw new NonRetryableBlockchainError(`Contract reverted on-chain: ${receipt.hash}`);
    }

    logger.info(`Transaction confirmed: ${receipt.hash} (Block ${receipt.blockNumber})`);

    return {
      hash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /** Map an ethers/unknown failure onto the queue's retry taxonomy. */
  private toDomainError(error: unknown): Error {
    if (error instanceof NonRetryableBlockchainError) return error;
    // The journal callback's own fence: not a blockchain failure at all.
    // Wrapping it would make a reclaimed lock look like a send failure to
    // retry, which is the exact misreporting the fence exists to prevent.
    if (error instanceof LockLostError) return error;

    logger.error('Blockchain transaction error', { error });

    const code = getErrorCode(error);
    if (code === 'CALL_EXCEPTION') {
      // Contract revert — same inputs will revert again forever.
      return new NonRetryableBlockchainError(
        `Contract reverted: ${getErrorMessage(error)}`
      );
    }
    if (code === 'INSUFFICIENT_FUNDS') {
      // Retryable: the wallet can be topped up (the balance monitor
      // is already warning the operator).
      return new Error('Insufficient funds for gas fees');
    }
    if (code === 'NETWORK_ERROR') {
      return new Error('Network connection error');
    }

    return new Error(`Blockchain error: ${getErrorMessage(error)}`);
  }

  /**
   * Wait for one confirmation of an already-broadcast hash. Fetches the
   * transaction so the replacement/repricing detection of `tx.wait()` is
   * kept; a hash the node no longer knows falls back to its receipt (it
   * may have mined) and otherwise reports "not confirmed" (null).
   */
  private async waitForHash(
    hash: string,
    timeoutMs: number
  ): Promise<ethers.TransactionReceipt | null> {
    const tx = await this.provider.getTransaction(hash);
    if (!tx) return this.provider.getTransactionReceipt(hash);
    return this.waitWithTimeout(tx, timeoutMs);
  }

  /**
   * Wait up to `timeoutMs` for 1 confirmation.
   * Returns null on timeout; resolves the effective receipt if the tx
   * was repriced (our own fee-bump replacement).
   */
  private async waitWithTimeout(
    tx: ethers.TransactionResponse,
    timeoutMs: number
  ): Promise<ethers.TransactionReceipt | null> {
    try {
      return await tx.wait(1, timeoutMs);
    } catch (error) {
      const code = getErrorCode(error);
      if (code === 'TIMEOUT') return null;
      if (code === 'TRANSACTION_REPLACED') {
        // A replacement with the same nonce mined. If it was our own
        // repriced copy of the same call, that's a success.
        const replaced = error as unknown as {
          reason?: string;
          receipt?: ethers.TransactionReceipt | null;
        };
        if (replaced.reason === 'repriced' && replaced.receipt?.status === 1) {
          return replaced.receipt;
        }
      }
      throw error;
    }
  }

  /**
   * Replace-by-fee: re-send the same call data with the same nonce and
   * fees bumped by 25% (nodes require >= +10% to accept a replacement).
   * If the original already mined, returns its receipt instead.
   *
   * `onReplacement` is invoked with the replacement hash BEFORE the signed
   * transaction is handed to the node, so the journal records the new hash
   * while the replacement exists only as a signature: a broadcast whose
   * acknowledgement is lost can still have reached the node, and the row
   * must already name it. If the caller's journal is a fenced write that
   * reports the lock lost, this throws (LockLostError) and the replacement
   * is never broadcast — a nonce this worker no longer holds must not be
   * spent.
   */
  private async replaceWithFeeBump(
    sent: SentTransaction,
    timeoutMs: number,
    onReplacement?: OnReplacementHash
  ): Promise<ethers.TransactionReceipt | null> {
    // The original may have been mined between our timeout and now.
    if (sent.hash) {
      const minedOriginal = await this.provider.getTransactionReceipt(sent.hash);
      if (minedOriginal) return minedOriginal;
    }

    // Sign the replacement locally. Signing fixes the hash with no network
    // round trip, so the journal can learn the exact transaction that is
    // about to be broadcast — the same ordering as the initial send.
    const prepared = await this.prepareReplacement(sent);

    // Journal BEFORE broadcasting. This is the fence, not a formality: the
    // queue throws LockLostError when its fenced write matches no row, and
    // a lost lock means this nonce is not ours to spend any more.
    await onReplacement?.(prepared.hash);
    logger.info(`Replacement transaction sent: ${prepared.hash} (nonce ${sent.nonce})`);

    try {
      const bumped = await this.provider.broadcastTransaction(prepared.raw);
      return await this.waitWithTimeout(bumped, timeoutMs);
    } catch (error) {
      // NONCE_EXPIRED / REPLACEMENT_UNDERPRICED usually mean the original
      // confirmed while we were preparing the replacement.
      if (sent.hash) {
        const receipt = await this.provider.getTransactionReceipt(sent.hash);
        if (receipt) return receipt;
      }
      throw error;
    }
  }

  /**
   * Build and sign the replace-by-fee transaction for a stuck `sent`
   * transaction, WITHOUT sending it anywhere.
   *
   * Same nonce and same calldata; fees bumped by `FEE_BUMP_PERCENT`
   * (nodes require >= +10% to accept a replacement). When the stuck
   * transaction's gas limit is unknown the request omits it, so
   * `populateTransaction` estimates it against the node. Signing is
   * local, so the returned transaction already has its final hash — the
   * hash the journal must learn before the broadcast happens.
   */
  private async prepareReplacement(sent: SentTransaction): Promise<PreparedTransaction> {
    const populated = await this.wallet.populateTransaction({
      to: sent.to,
      data: sent.data,
      // recordCompletion is non-payable: nothing to carry over.
      value: 0n,
      nonce: sent.nonce,
      gasLimit: sent.gasLimit ?? undefined,
      maxFeePerGas:
        sent.maxFeePerGas != null
          ? (sent.maxFeePerGas * FEE_BUMP_PERCENT) / 100n
          : undefined,
      maxPriorityFeePerGas:
        sent.maxPriorityFeePerGas != null
          ? (sent.maxPriorityFeePerGas * FEE_BUMP_PERCENT) / 100n
          : undefined,
    });

    const raw = await this.wallet.signTransaction(populated);
    const hash = ethers.Transaction.from(raw).hash;

    if (!hash) {
      // Unreachable for a signed transaction, and worth failing loudly
      // rather than journaling an empty hash if ethers ever changes.
      throw new Error('Signed replacement transaction has no hash');
    }

    return {
      raw,
      hash,
      nonce: sent.nonce,
      data: populated.data ?? sent.data,
      to: (populated.to as string | null) ?? sent.to,
      gasLimit: this.asBigInt(populated.gasLimit),
      maxFeePerGas: this.asBigInt(populated.maxFeePerGas),
      maxPriorityFeePerGas: this.asBigInt(populated.maxPriorityFeePerGas),
    };
  }

  /**
   * Test blockchain connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      logger.info(`Connected to blockchain. Current block: ${blockNumber}`);

      const balance = await this.provider.getBalance(this.wallet.address);
      logger.info(`Wallet balance: ${ethers.formatEther(balance)} ETH`);

      return true;
    } catch (error) {
      logger.error('Blockchain connection test failed:', error);
      return false;
    }
  }

  /**
   * Verify message signature (for Web3 auth)
   */
  verifySignature(message: string, signature: string, expectedAddress: string): boolean {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
      logger.error('Signature verification error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const web3Service = new Web3Service();
