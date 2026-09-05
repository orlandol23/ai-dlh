import { ethers } from 'ethers';
import { config } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { getErrorCode, getErrorMessage } from '../utils/errors.js';

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
 * without holding on to the ethers `TransactionResponse`. The queue
 * journals `hash` and `nonce` to the database BETWEEN the broadcast and
 * the wait, which is what makes the on-chain write survive a crash.
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
 * Called with each replacement hash the service broadcasts, BEFORE it
 * starts waiting on it. The queue appends the hash to the journal, so a
 * crash never leaves an in-flight hash the recovery path cannot check.
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
   * Broadcast a `recordCompletion` transaction and return as soon as the
   * node accepts it — WITHOUT waiting for the receipt.
   *
   * The split exists so the caller can persist the hash and nonce before
   * the (minutes-long) wait: a crash inside `sendCompletion` cannot have
   * produced an on-chain record, while a crash after it leaves a journal
   * that `recoverCompletion` can resolve without ever sending twice.
   */
  async sendCompletion(
    moduleId: number,
    score: number,
    topic: string
  ): Promise<SentTransaction> {
    logger.info(`Recording completion on blockchain: Module ${moduleId}, Score ${score}`);

    try {
      // Check wallet balance
      const balance = await this.getWalletBalance();
      logger.debug(`Wallet balance: ${ethers.formatEther(balance)} ETH`);

      if (balance === 0n) {
        throw new Error('Wallet has no funds for gas fees');
      }

      // Send transaction (ethers fills the nonce from the pending pool)
      const tx: ethers.TransactionResponse = await this.contract.recordCompletion(
        moduleId,
        score,
        topic
      );
      logger.debug(`Transaction sent: ${tx.hash} (nonce ${tx.nonce})`);

      return {
        hash: tx.hash,
        nonce: tx.nonce,
        data: tx.data,
        to: tx.to ?? config.CONTRACT_ADDRESS,
        gasLimit: tx.gasLimit ?? null,
        maxFeePerGas: tx.maxFeePerGas ?? null,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas ?? null,
      };
    } catch (error) {
      throw this.toDomainError(error);
    }
  }

  /**
   * Wait for a transaction broadcast by `sendCompletion`.
   *
   * Stuck-transaction strategy (unchanged by the send/wait split):
   * 1. Wait up to `timeoutMs` for 1 confirmation.
   * 2. If it doesn't confirm in time, re-send the SAME nonce with fees
   *    bumped by 25% (replace-by-fee) and wait again. If the original
   *    mines in the meantime, ethers reports TRANSACTION_REPLACED /
   *    NONCE_EXPIRED and we recover the original receipt.
   * 3. If the replacement also times out, throw a retryable error — the
   *    queue worker retries later, and the retry goes through
   *    `recoverCompletion`, which reuses the still-stuck nonce.
   *
   * `onReplacement` is invoked with every replacement hash BEFORE we wait
   * on it, so the caller's journal always knows every hash sent on this
   * nonce.
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
   * `onReplacement` is awaited BEFORE the wait, so the journal records
   * the new hash while it is in flight: a crash here must never leave a
   * broadcast hash that recovery cannot look up.
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

    try {
      const bumped = await this.wallet.sendTransaction({
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
      logger.info(`Replacement transaction sent: ${bumped.hash} (nonce ${sent.nonce})`);
      await onReplacement?.(bumped.hash);
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
