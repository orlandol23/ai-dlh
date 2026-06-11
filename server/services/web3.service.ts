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

  /**
   * Record module completion on blockchain
   */
  async recordCompletion(
    moduleId: number,
    score: number,
    topic: string
  ): Promise<BlockchainReceipt> {
    logger.info(`Recording completion on blockchain: Module ${moduleId}, Score ${score}`);

    try {
      // Check wallet balance
      const balance = await this.provider.getBalance(this.wallet.address);
      logger.debug(`Wallet balance: ${ethers.formatEther(balance)} ETH`);

      if (balance === 0n) {
        throw new Error('Wallet has no funds for gas fees');
      }

      // Send transaction
      const tx = await this.contract.recordCompletion(moduleId, score, topic);
      logger.debug(`Transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }

      logger.info(`Transaction confirmed: ${receipt.hash} (Block ${receipt.blockNumber})`);

      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };

    } catch (error) {
      logger.error('Blockchain transaction error', { error });

      const code = getErrorCode(error);
      if (code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds for gas fees');
      }
      if (code === 'NETWORK_ERROR') {
        throw new Error('Network connection error');
      }

      throw new Error(`Blockchain error: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Get user progress from blockchain
   */
  async getUserProgress(walletAddress: string): Promise<CompletionData[]> {
    logger.debug(`Fetching progress for ${walletAddress}`);

    try {
      const progress = await this.contract.getUserProgress(walletAddress);

      return progress.map((p: any) => ({
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
