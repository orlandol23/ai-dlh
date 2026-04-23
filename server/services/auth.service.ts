import jwt from 'jsonwebtoken';
import { config } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { db } from '../db/index.js';
import { users, authNonces, type User } from '../db/schema.js';
import { eq, lt } from 'drizzle-orm';
import { web3Service } from './web3.service.js';

export interface JWTPayload {
  userId: number;
  walletAddress: string;
}

export interface AuthResult {
  token: string;
  user: User;
}

/**
 * Parsed login message produced by the frontend.
 * The shape is enforced strictly: any deviation is rejected.
 */
interface ParsedLoginMessage {
  domain: string;
  address: string;
  timestamp: number;
  nonce: string;
}

// Exact grammar the frontend must produce. We parse defensively because
// the signed payload is attacker-controlled.
const LOGIN_MESSAGE_REGEX =
  /^AI-DLH Authentication\nDomain: (?<domain>[^\n]+)\nAddress: (?<address>0x[a-fA-F0-9]{40})\nTimestamp: (?<timestamp>\d{10,16})\nNonce: (?<nonce>[A-Za-z0-9_-]{16,128})$/;

function parseLoginMessage(message: string): ParsedLoginMessage | null {
  const match = LOGIN_MESSAGE_REGEX.exec(message);
  if (!match || !match.groups) return null;
  const { domain, address, timestamp, nonce } = match.groups;
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return null;
  return { domain, address, timestamp: ts, nonce };
}

export class AuthService {
  generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    } catch (error) {
      logger.warn('Token verification failed');
      return null;
    }
  }

  /**
   * Authenticate user with Web3 signature.
   *
   * Security properties enforced here:
   *  - Strict message grammar (domain, address, timestamp, nonce).
   *  - Signature recovered address must match declared address.
   *  - Declared address in the message must match the address used for lookup.
   *  - Domain must match the server's expected origin (FRONTEND_URL host).
   *  - Timestamp must be within AUTH_MESSAGE_MAX_AGE_MS and not in the future.
   *  - Nonce is consumed atomically via a unique DB constraint: a reused
   *    (nonce, wallet) pair will fail the insert and the login is rejected.
   */
  async authenticateWithSignature(
    walletAddress: string,
    message: string,
    signature: string
  ): Promise<AuthResult> {
    const normalizedWallet = walletAddress.toLowerCase();
    logger.info(`Authenticating wallet: ${normalizedWallet}`);

    const parsed = parseLoginMessage(message);
    if (!parsed) {
      throw new Error('Malformed login message');
    }

    if (parsed.address.toLowerCase() !== normalizedWallet) {
      throw new Error('Address mismatch');
    }

    // Verify signature over the exact message we received.
    const isValid = web3Service.verifySignature(message, signature, normalizedWallet);
    if (!isValid) {
      logger.warn(`Invalid signature for ${normalizedWallet}`);
      throw new Error('Invalid signature');
    }

    // Domain binding: reject messages signed for a different site (prevents
    // a signature captured elsewhere from being replayed against us).
    // Hostnames are case-insensitive per RFC 3986; normalize both sides.
    const expectedDomain = new URL(config.FRONTEND_URL).host.toLowerCase();
    if (parsed.domain.trim().toLowerCase() !== expectedDomain) {
      logger.warn(`Domain mismatch: expected=${expectedDomain} got=${parsed.domain}`);
      throw new Error('Domain mismatch');
    }

    // Time window.
    const now = Date.now();
    const age = now - parsed.timestamp;
    if (age > config.AUTH_MESSAGE_MAX_AGE_MS) {
      throw new Error('Message expired');
    }
    // 30s of tolerated forward clock skew; anything beyond that is suspect.
    if (age < -30_000) {
      throw new Error('Message timestamp is in the future');
    }

    // Atomically consume the nonce. The unique index on (nonce, wallet)
    // means a replay attempt fails at the DB layer rather than relying on
    // a read-then-write race window.
    //
    // Non-unique-violation failures (connection errors, permission errors,
    // driver-level bugs, etc.) are logged server-side and surfaced to the
    // client as a generic message, because `auth.router.ts` forwards
    // `error.message` verbatim via `TRPCError` — raw DB details must not
    // reach the client.
    try {
      await db.insert(authNonces).values({
        nonce: parsed.nonce,
        walletAddress: normalizedWallet,
      });
    } catch (error: any) {
      // Postgres unique-violation: 23505
      if (error?.code === '23505' || /duplicate key|unique/i.test(String(error?.message))) {
        logger.warn(`Nonce replay detected for ${normalizedWallet}`);
        throw new Error('Nonce already used');
      }
      logger.error('Failed to consume authentication nonce', {
        error,
        walletAddress: normalizedWallet,
      });
      throw new Error('Authentication failed');
    }

    // Find or create user.
    let user = await db.query.users.findFirst({
      where: eq(users.walletAddress, normalizedWallet),
    });

    if (!user) {
      logger.info(`Creating new user for ${normalizedWallet}`);
      const [newUser] = await db
        .insert(users)
        .values({
          walletAddress: normalizedWallet,
          lastLoginAt: new Date(),
        })
        .returning();
      user = newUser;
    } else {
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));
    }

    const token = this.generateToken({
      userId: user.id,
      walletAddress: user.walletAddress,
    });

    logger.info(`User authenticated: ${user.id}`);

    // Opportunistic housekeeping. Serverless deploys (Vercel) have no
    // long-running scheduler, so we trigger pruning probabilistically on
    // login. Roughly 1% of logins pay the cost; the table stays bounded
    // without needing an external cron.
    if (Math.random() < 0.01) {
      this.pruneExpiredNonces().catch((error) => {
        logger.warn('Background nonce prune failed', error as Error);
      });
    }

    return { token, user };
  }

  /**
   * Housekeeping: drop consumed nonces older than twice the max message
   * age. The 2x grace window keeps a recently-used nonce around long
   * enough that any in-flight retry of the same message still hits the
   * unique-constraint check rather than silently being re-accepted after
   * deletion. Safe to call concurrently; no-op if nothing to delete.
   */
  async pruneExpiredNonces(): Promise<void> {
    const cutoff = new Date(Date.now() - config.AUTH_MESSAGE_MAX_AGE_MS * 2);
    try {
      await db.delete(authNonces).where(lt(authNonces.usedAt, cutoff));
    } catch (error) {
      logger.warn('Failed to prune expired nonces', error as Error);
    }
  }

  async getUserById(userId: number): Promise<User | null> {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    return user || null;
  }

  async getUserByWallet(walletAddress: string): Promise<User | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.walletAddress, walletAddress.toLowerCase()),
    });
    return user || null;
  }

  async updateUserProfile(
    userId: number,
    data: { name?: string; email?: string; avatar?: string }
  ): Promise<User> {
    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) throw new Error('User not found');
    return updated;
  }
}

export const authService = new AuthService();
