import jwt from 'jsonwebtoken';
import { config } from '../utils/env';
import { logger } from '../utils/logger';
import { db } from '../db';
import { users, type User } from '../db/schema';
import { eq } from 'drizzle-orm';
import { web3Service } from './web3.service';

export interface JWTPayload {
  userId: number;
  walletAddress: string;
}

export interface AuthResult {
  token: string;
  user: User;
}

/**
 * Authentication Service for Web3-based user authentication.
 * 
 * Features:
 * - JWT token generation and verification
 * - Web3 signature validation
 * - User management (create, update, fetch)
 * - Session management with token expiration
 * 
 * @class AuthService
 */
export class AuthService {
  /**
   * Generate JWT token with user payload
   * @param {JWTPayload} payload - User ID and wallet address
   * @returns {string} Signed JWT token
   */
  generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
      return payload;
    } catch (error) {
      logger.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Authenticate user with Web3 signature
   */
  async authenticateWithSignature(
    walletAddress: string,
    message: string,
    signature: string
  ): Promise<AuthResult> {
    logger.info(`Authenticating wallet: ${walletAddress}`);

    // Verify signature
    const isValid = web3Service.verifySignature(message, signature, walletAddress);

    if (!isValid) {
      logger.warn(`Invalid signature for ${walletAddress}`);
      throw new Error('Invalid signature');
    }

    // Check if message is recent (within 5 minutes)
    const messageMatch = message.match(/Time: (\d+)/);
    if (messageMatch) {
      const timestamp = parseInt(messageMatch[1]);
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (now - timestamp > fiveMinutes) {
        throw new Error('Message expired');
      }
    }

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.walletAddress, walletAddress.toLowerCase()),
    });

    if (!user) {
      // Create new user
      logger.info(`Creating new user for ${walletAddress}`);
      const [newUser] = await db
        .insert(users)
        .values({
          walletAddress: walletAddress.toLowerCase(),
          lastLoginAt: new Date(),
        })
        .returning();

      user = newUser;
    } else {
      // Update last login
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));
    }

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      walletAddress: user.walletAddress,
    });

    logger.info(`User authenticated: ${user.id} (${walletAddress})`);

    return {
      token,
      user,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: number): Promise<User | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    return user || null;
  }

  /**
   * Get user by wallet address
   */
  async getUserByWallet(walletAddress: string): Promise<User | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.walletAddress, walletAddress.toLowerCase()),
    });

    return user || null;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: number,
    data: { name?: string; email?: string; avatar?: string }
  ): Promise<User> {
    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new Error('User not found');
    }

    return updated;
  }
}

// Export singleton instance
export const authService = new AuthService();
