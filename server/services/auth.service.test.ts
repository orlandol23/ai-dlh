import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomBytes } from 'node:crypto';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-jwt-secret-with-at-least-32-chars!!';
const MAX_AGE_MS = 300_000; // mirrors the 5 min default

const mocks = vi.hoisted(() => ({
  // Tracks consumed (nonce, wallet) pairs to emulate the DB unique index —
  // the default implementation set in beforeEach throws Postgres' 23505 on
  // a duplicate, exactly like the real auth_nonces constraint.
  usedNonces: new Set<string>(),
  insertNonce: vi.fn(),
  upsertUser: vi.fn(),
  usersFindFirst: vi.fn(),
  deleteWhere: vi.fn(),
}));

// env.ts validates process.env and exits on failure — stub it out so the
// test runs without a real environment.
vi.mock('../utils/env.js', () => ({
  config: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret-with-at-least-32-chars!!',
    JWT_EXPIRES_IN: '7d',
    FRONTEND_URL: 'http://localhost:5173',
    AUTH_MESSAGE_MAX_AGE_MS: 300_000,
  },
  allowedOrigins: [],
  allowedOriginSuffixes: [],
  isProduction: () => false,
  isDevelopment: () => false,
  isTest: () => true,
}));

// The DB mock distinguishes the two tables touched inside the login
// transaction by identity: authNonces inserts resolve/reject directly
// (unique-index emulation above), users inserts go through the
// onConflictDoUpdate().returning() upsert chain.
vi.mock('../db/index.js', async () => {
  const schema = await import('../db/schema.js');
  const tx = {
    insert: (table: unknown) => ({
      values: (vals: Record<string, unknown>) => {
        if (table === schema.authNonces) return mocks.insertNonce(vals);
        return {
          onConflictDoUpdate: () => ({ returning: () => mocks.upsertUser(vals) }),
        };
      },
    }),
  };
  return {
    db: {
      transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
      query: { users: { findFirst: mocks.usersFindFirst } },
      delete: () => ({ where: mocks.deleteWhere }),
    },
  };
});

// Real signature recovery (mirrors Web3Service.verifySignature exactly),
// without constructing the real service — its constructor needs an RPC URL,
// a funded private key and a contract address. Using actual ethers here is
// the point of the suite: messages are signed by real ephemeral wallets.
vi.mock('./web3.service.js', async () => {
  const { ethers: realEthers } = await import('ethers');
  return {
    web3Service: {
      verifySignature: (message: string, signature: string, expected: string) => {
        try {
          return realEthers.verifyMessage(message, signature).toLowerCase() === expected.toLowerCase();
        } catch {
          return false;
        }
      },
    },
  };
});

import { authService } from './auth.service.js';

/** Nonce in the grammar's [A-Za-z0-9_-]{16,128} alphabet (~22 chars). */
function freshNonce(): string {
  return randomBytes(16).toString('base64url');
}

function loginMessage(opts: {
  address: string;
  domain?: string;
  timestamp?: number | string;
  nonce?: string;
}): string {
  return [
    'AI-DLH Authentication',
    `Domain: ${opts.domain ?? 'localhost:5173'}`,
    `Address: ${opts.address}`,
    `Timestamp: ${opts.timestamp ?? Date.now()}`,
    `Nonce: ${opts.nonce ?? freshNonce()}`,
  ].join('\n');
}

/** Sign + submit in one go (the happy-path plumbing most tests share). */
async function login(
  wallet: ethers.HDNodeWallet,
  message: string,
): Promise<Awaited<ReturnType<typeof authService.authenticateWithSignature>>> {
  const signature = await wallet.signMessage(message);
  return authService.authenticateWithSignature(wallet.address, message, signature);
}

let wallet: ethers.HDNodeWallet;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.usedNonces.clear();

  // Default DB behavior: nonce insert enforces the unique index, user
  // upsert returns a row with the inserted wallet.
  mocks.insertNonce.mockImplementation(async (vals: { nonce: string; walletAddress: string }) => {
    const key = `${vals.nonce}|${vals.walletAddress}`;
    if (mocks.usedNonces.has(key)) {
      const err = new Error('duplicate key value violates unique constraint');
      (err as Error & { code: string }).code = '23505';
      throw err;
    }
    mocks.usedNonces.add(key);
  });
  mocks.upsertUser.mockImplementation(async (vals: { walletAddress: string }) => [
    { id: 42, walletAddress: vals.walletAddress, learningStyle: null },
  ]);
  mocks.deleteWhere.mockResolvedValue(undefined);

  // Pin the probabilistic post-login nonce pruning (fires when < 0.01) off.
  vi.spyOn(Math, 'random').mockReturnValue(0.99);

  wallet = ethers.Wallet.createRandom();
});

describe('authenticateWithSignature — happy path', () => {
  it('accepts a well-formed signed message and returns a verifiable JWT + user', async () => {
    const result = await login(wallet, loginMessage({ address: wallet.address }));

    expect(result.user).toMatchObject({
      id: 42,
      walletAddress: wallet.address.toLowerCase(),
    });

    const payload = authService.verifyToken(result.token);
    expect(payload).toMatchObject({
      userId: 42,
      walletAddress: wallet.address.toLowerCase(),
    });
  });

  it('consumes the nonce and upserts the user with the lowercased wallet', async () => {
    const nonce = freshNonce();
    await login(wallet, loginMessage({ address: wallet.address, nonce }));

    expect(mocks.insertNonce).toHaveBeenCalledWith({
      nonce,
      walletAddress: wallet.address.toLowerCase(),
    });
    expect(mocks.upsertUser).toHaveBeenCalledTimes(1);
    expect(mocks.upsertUser.mock.calls[0][0].walletAddress).toBe(wallet.address.toLowerCase());
  });
});

describe('authenticateWithSignature — strict message grammar', () => {
  it('rejects trailing content after the nonce line', async () => {
    const message = loginMessage({ address: wallet.address }) + '\nExtra: injected';
    await expect(login(wallet, message)).rejects.toThrow('Malformed login message');
  });

  it('rejects a missing Nonce line', async () => {
    const message = [
      'AI-DLH Authentication',
      'Domain: localhost:5173',
      `Address: ${wallet.address}`,
      `Timestamp: ${Date.now()}`,
    ].join('\n');
    await expect(login(wallet, message)).rejects.toThrow('Malformed login message');
  });

  it('rejects a wrong header line', async () => {
    const message = loginMessage({ address: wallet.address }).replace(
      'AI-DLH Authentication',
      'Some Other App Authentication',
    );
    await expect(login(wallet, message)).rejects.toThrow('Malformed login message');
  });

  it('rejects reordered fields even when all are present', async () => {
    const message = [
      'AI-DLH Authentication',
      `Address: ${wallet.address}`,
      'Domain: localhost:5173',
      `Timestamp: ${Date.now()}`,
      `Nonce: ${freshNonce()}`,
    ].join('\n');
    await expect(login(wallet, message)).rejects.toThrow('Malformed login message');
  });

  it('rejects a seconds-since-epoch (10-digit) timestamp', async () => {
    const message = loginMessage({
      address: wallet.address,
      timestamp: Math.floor(Date.now() / 1000), // 10 digits, not 13
    });
    await expect(login(wallet, message)).rejects.toThrow('Malformed login message');
  });

  it('rejects a nonce shorter than 16 characters', async () => {
    const message = loginMessage({ address: wallet.address, nonce: 'short-nonce' });
    await expect(login(wallet, message)).rejects.toThrow('Malformed login message');
  });

  it('rejects a nonce with characters outside [A-Za-z0-9_-]', async () => {
    const message = loginMessage({
      address: wallet.address,
      nonce: 'invalid!nonce#with$symbols%1234',
    });
    await expect(login(wallet, message)).rejects.toThrow('Malformed login message');
  });

  it('rejects a malformed address inside the message', async () => {
    const message = loginMessage({ address: '0x1234notanaddress' });
    const signature = await wallet.signMessage(message);
    await expect(
      authService.authenticateWithSignature(wallet.address, message, signature),
    ).rejects.toThrow('Malformed login message');
  });
});

describe('authenticateWithSignature — address binding', () => {
  it('rejects when the message address differs from the claimed wallet', async () => {
    const other = ethers.Wallet.createRandom();
    const message = loginMessage({ address: other.address });
    const signature = await wallet.signMessage(message);

    await expect(
      authService.authenticateWithSignature(wallet.address, message, signature),
    ).rejects.toThrow('Address mismatch');
  });
});

describe('authenticateWithSignature — signature verification', () => {
  it('rejects a message signed by a different wallet', async () => {
    const attacker = ethers.Wallet.createRandom();
    const message = loginMessage({ address: wallet.address });
    const signature = await attacker.signMessage(message);

    await expect(
      authService.authenticateWithSignature(wallet.address, message, signature),
    ).rejects.toThrow('Invalid signature');
  });

  it('rejects garbage signature bytes', async () => {
    const message = loginMessage({ address: wallet.address });

    await expect(
      authService.authenticateWithSignature(wallet.address, message, '0xdeadbeef'),
    ).rejects.toThrow('Invalid signature');
  });

  it('rejects when the message was altered after signing', async () => {
    const original = loginMessage({ address: wallet.address, timestamp: Date.now() });
    const signature = await wallet.signMessage(original);
    const tampered = original.replace(/Timestamp: \d{13}/, `Timestamp: ${Date.now() + 1}`);

    await expect(
      authService.authenticateWithSignature(wallet.address, tampered, signature),
    ).rejects.toThrow('Invalid signature');
  });
});

describe('authenticateWithSignature — domain binding', () => {
  it('rejects a message signed for a different site', async () => {
    const message = loginMessage({ address: wallet.address, domain: 'evil.example.com' });
    await expect(login(wallet, message)).rejects.toThrow('Domain mismatch');
  });

  it('rejects the bare hostname when the expected origin carries a port', async () => {
    const message = loginMessage({ address: wallet.address, domain: 'localhost' });
    await expect(login(wallet, message)).rejects.toThrow('Domain mismatch');
  });

  it('accepts the expected domain case-insensitively (RFC 3986 hostnames)', async () => {
    const message = loginMessage({ address: wallet.address, domain: 'LOCALHOST:5173' });
    const result = await login(wallet, message);
    expect(result.user.id).toBe(42);
  });
});

describe('authenticateWithSignature — time window', () => {
  it('rejects a message older than AUTH_MESSAGE_MAX_AGE_MS', async () => {
    const message = loginMessage({
      address: wallet.address,
      timestamp: Date.now() - MAX_AGE_MS - 1_000,
    });
    await expect(login(wallet, message)).rejects.toThrow('Message expired');
  });

  it('tolerates up to 30s of forward clock skew', async () => {
    const message = loginMessage({ address: wallet.address, timestamp: Date.now() + 29_000 });
    const result = await login(wallet, message);
    expect(result.user.id).toBe(42);
  });

  it('rejects a timestamp more than 30s in the future', async () => {
    const message = loginMessage({ address: wallet.address, timestamp: Date.now() + 31_000 });
    await expect(login(wallet, message)).rejects.toThrow('Message timestamp is in the future');
  });
});

describe('authenticateWithSignature — nonce anti-replay', () => {
  it('rejects the second submission of the same nonce', async () => {
    const message = loginMessage({ address: wallet.address });
    const signature = await wallet.signMessage(message);

    await authService.authenticateWithSignature(wallet.address, message, signature);
    await expect(
      authService.authenticateWithSignature(wallet.address, message, signature),
    ).rejects.toThrow('Nonce already used');

    expect(mocks.upsertUser).toHaveBeenCalledTimes(1); // replay never reached the upsert
  });

  it('accepts a fresh nonce from the same wallet after a replay attempt', async () => {
    const first = loginMessage({ address: wallet.address });
    const signature = await wallet.signMessage(first);
    await authService.authenticateWithSignature(wallet.address, first, signature);
    await expect(
      authService.authenticateWithSignature(wallet.address, first, signature),
    ).rejects.toThrow('Nonce already used');

    const result = await login(wallet, loginMessage({ address: wallet.address }));
    expect(result.user.id).toBe(42);
  });

  it('maps non-unique-violation DB failures to a generic error (no detail leaks)', async () => {
    const dbError = new Error('connection to server was lost: host=10.0.0.5 db=prod');
    (dbError as Error & { code: string }).code = '08006';
    mocks.insertNonce.mockRejectedValueOnce(dbError);

    await expect(login(wallet, loginMessage({ address: wallet.address }))).rejects.toThrow(
      'Authentication failed',
    );
  });

  it('maps user-upsert failures to the same generic error', async () => {
    mocks.upsertUser.mockRejectedValueOnce(new Error('relation "users" does not exist'));

    await expect(login(wallet, loginMessage({ address: wallet.address }))).rejects.toThrow(
      'Authentication failed',
    );
  });
});

describe('JWT issuance and validation', () => {
  it('round-trips generateToken → verifyToken', () => {
    const token = authService.generateToken({ userId: 7, walletAddress: '0xabc' });
    expect(authService.verifyToken(token)).toMatchObject({
      userId: 7,
      walletAddress: '0xabc',
    });
  });

  it('returns null for a tampered token', () => {
    const token = authService.generateToken({ userId: 7, walletAddress: '0xabc' });
    const [header, , signature] = token.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ userId: 1, walletAddress: '0xattacker' }),
    ).toString('base64url');

    expect(authService.verifyToken(`${header}.${forgedPayload}.${signature}`)).toBeNull();
  });

  it('returns null for a token signed with a different secret', () => {
    const forged = jwt.sign({ userId: 7, walletAddress: '0xabc' }, 'another-secret-entirely');
    expect(authService.verifyToken(forged)).toBeNull();
  });

  it('returns null for an expired token', () => {
    const expired = jwt.sign({ userId: 7, walletAddress: '0xabc' }, JWT_SECRET, {
      expiresIn: '-1s',
    });
    expect(authService.verifyToken(expired)).toBeNull();
  });
});
