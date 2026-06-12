import { ethers } from 'ethers';
import { config } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { getErrorCode, getErrorMessage } from '../utils/errors.js';

// Learning Progress ABI (minimal - only what we need)
const LEARNING_PROGRESS_ABI = [
  'function recordCompletion(uint256 _moduleId, uint256 _score, string memory _moduleTopic) external',
  'function getUserProgress(address _user) external view returns (tuple(uint256 moduleId, uint256 score, uint256 timestamp, string moduleTopic)[])',
  'function getUserCompletionCount(address _user) external view returns (uint256)',
  'function getUserAverageScore(address _user) external view returns (uint256)',
  'function totalCompletions() external view returns (uint256)',
  'event ModuleCompleted(address indexed user, uint256 indexed moduleId, uint256 score, uint256 timestamp, string moduleTopic)',
];

export interface CompletionData {
  moduleId: number;
  score: number;
  timestamp: number;
  moduleTopic: string;
}

export interface BlockchainReceipt {
  hash: string;
  blockNumber: number;
  gasUsed: string;
}

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
 * - Retrieves user progress from smart contract
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
   * Record module completion on blockchain.
   *
   * Stuck-transaction strategy (kept deliberately simple):
   * 1. Send the tx letting ethers pick the next nonce, then wait up to
   *    `timeoutMs` for 1 confirmation.
   * 2. If it doesn't confirm in time, re-send the SAME nonce with fees
   *    bumped by 25% (replace-by-fee) and wait again. If the original
   *    mines in the meantime, ethers reports TRANSACTION_REPLACED /
   *    NONCE_EXPIRED and we recover the original receipt.
   * 3. If the replacement also times out, throw a retryable error — the
   *    queue worker retries later, and since this service sends txs
   *    sequentially (single in-process worker), the next attempt reuses
   *    the still-stuck nonce with fresh market fees, acting as another
   *    replacement.
   *
   * Throws NonRetryableBlockchainError for contract reverts
   * (CALL_EXCEPTION): retrying the exact same call can never succeed.
   */
  async recordCompletion(
    moduleId: number,
    score: number,
    topic: string,
    timeoutMs: number = 90_000
  ): Promise<BlockchainReceipt> {
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

      // Wait for confirmation, with a timeout so a stuck tx doesn't hold
      // the queue forever.
      let receipt = await this.waitWithTimeout(tx, timeoutMs);

      if (!receipt) {
        logger.warn(
          `Transaction ${tx.hash} not confirmed after ${timeoutMs}ms — replacing with fee bump`,
          { nonce: tx.nonce }
        );
        receipt = await this.replaceWithFeeBump(tx, timeoutMs);
      }

      if (!receipt) {
        // Still stuck after the replacement attempt: surface a retryable
        // error. The queue worker will try again later.
        throw new Error('Transaction not confirmed in time (will be retried)');
      }

      logger.info(`Transaction confirmed: ${receipt.hash} (Block ${receipt.blockNumber})`);

      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };

    } catch (error) {
      if (error instanceof NonRetryableBlockchainError) throw error;

      logger.error('Blockchain transaction error', { error });

      const code = getErrorCode(error);
      if (code === 'CALL_EXCEPTION') {
        // Contract revert — same inputs will revert again forever.
        throw new NonRetryableBlockchainError(
          `Contract reverted: ${getErrorMessage(error)}`
        );
      }
      if (code === 'INSUFFICIENT_FUNDS') {
        // Retryable: the wallet can be topped up (the balance monitor
        // is already warning the operator).
        throw new Error('Insufficient funds for gas fees');
      }
      if (code === 'NETWORK_ERROR') {
        throw new Error('Network connection error');
      }

      throw new Error(`Blockchain error: ${getErrorMessage(error)}`);
    }
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
   */
  private async replaceWithFeeBump(
    tx: ethers.TransactionResponse,
    timeoutMs: number
  ): Promise<ethers.TransactionReceipt | null> {
    // The original may have been mined between our timeout and now.
    const minedOriginal = await this.provider.getTransactionReceipt(tx.hash);
    if (minedOriginal) return minedOriginal;

    try {
      const bumped = await this.wallet.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value ?? 0n,
        nonce: tx.nonce,
        gasLimit: tx.gasLimit,
        maxFeePerGas:
          tx.maxFeePerGas != null ? (tx.maxFeePerGas * FEE_BUMP_PERCENT) / 100n : undefined,
        maxPriorityFeePerGas:
          tx.maxPriorityFeePerGas != null
            ? (tx.maxPriorityFeePerGas * FEE_BUMP_PERCENT) / 100n
            : undefined,
      });
      logger.info(`Replacement transaction sent: ${bumped.hash} (nonce ${tx.nonce})`);
      return await this.waitWithTimeout(bumped, timeoutMs);
    } catch (error) {
      // NONCE_EXPIRED / REPLACEMENT_UNDERPRICED usually mean the original
      // confirmed while we were preparing the replacement.
      const receipt = await this.provider.getTransactionReceipt(tx.hash);
      if (receipt) return receipt;
      throw error;
    }
  }

  /**
   * Get user progress from blockchain
   */
  async getUserProgress(walletAddress: string): Promise<CompletionData[]> {
    logger.debug(`Fetching progress for ${walletAddress}`);

    try {
      const progress = await this.contract.getUserProgress(walletAddress);

      // ethers returns tuple Results; index by the ABI field names.
      return progress.map((p: { moduleId: bigint; score: bigint; timestamp: bigint; moduleTopic: string }) => ({
        moduleId: Number(p.moduleId),
        score: Number(p.score),
        timestamp: Number(p.timestamp),
        moduleTopic: p.moduleTopic,
      }));

    } catch (error) {
      logger.error('Error fetching user progress', { error });
      throw new Error('Failed to fetch blockchain data');
    }
  }

  /**
   * Get user completion count
   */
  async getCompletionCount(walletAddress: string): Promise<number> {
    try {
      const count = await this.contract.getUserCompletionCount(walletAddress);
      return Number(count);
    } catch (error) {
      logger.error('Error fetching completion count', { error });
      throw new Error('Failed to fetch completion count');
    }
  }

  /**
   * Get user average score
   */
  async getAverageScore(walletAddress: string): Promise<number> {
    try {
      const avg = await this.contract.getUserAverageScore(walletAddress);
      return Number(avg);
    } catch (error) {
      logger.error('Error fetching average score', { error });
      throw new Error('Failed to fetch average score');
    }
  }

  /**
   * Get total completions on contract
   */
  async getTotalCompletions(): Promise<number> {
    try {
      const total = await this.contract.totalCompletions();
      return Number(total);
    } catch (error) {
      logger.error('Error fetching total completions', { error });
      throw new Error('Failed to fetch total completions');
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
