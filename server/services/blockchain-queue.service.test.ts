import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  // nextScheduledWorkAt() asks for the earliest parked retry and the oldest
  // in-flight lock via findFirst. Tests distinguish the two calls by the
  // requested columns (see parkedWork below).
  findFirst: vi.fn(),
  // One stack frame per `db.update(...)` call: `.set()` captures values,
  // `.where()` resolves to an object exposing `.returning()` whose result
  // is popped from `returningQueue` (claim UPDATEs use RETURNING; final
  // status UPDATEs are awaited directly — awaiting a non-thenable object
  // is a no-op, which is exactly what we want).
  setCalls: [] as Array<Record<string, unknown>>,
  returningQueue: [] as unknown[],
  sendCompletion: vi.fn(),
  waitForCompletion: vi.fn(),
  recoverCompletion: vi.fn(),
}));

vi.mock('../utils/env.js', () => ({
  config: {
    NODE_ENV: 'test',
    BLOCKCHAIN_QUEUE_INTERVAL_MS: 15_000,
    BLOCKCHAIN_QUEUE_MAX_INTERVAL_MS: 120_000,
    BLOCKCHAIN_QUEUE_MAX_ATTEMPTS: 3,
    BLOCKCHAIN_TX_TIMEOUT_MS: 90_000,
    BLOCKCHAIN_STALE_LOCK_MS: 600_000,
  },
  isProduction: () => false,
  isDevelopment: () => false,
  isTest: () => true,
}));

vi.mock('../db/index.js', () => ({
  db: {
    query: {
      progressRecords: { findMany: mocks.findMany, findFirst: mocks.findFirst },
    },
    update: vi.fn(() => ({
      set: vi.fn((values: Record<string, unknown>) => {
        mocks.setCalls.push(values);
        return {
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve(mocks.returningQueue.shift() ?? [])),
          })),
        };
      }),
    })),
  },
}));

// web3.service instantiates a provider/wallet at import time, so the whole
// module is replaced. NonRetryableBlockchainError must come from the mock
// too — the queue service `instanceof`-checks against the class it imports.
vi.mock('./web3.service.js', () => {
  class NonRetryableBlockchainError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NonRetryableBlockchainError';
    }
  }
  return {
    NonRetryableBlockchainError,
    web3Service: {
      sendCompletion: mocks.sendCompletion,
      waitForCompletion: mocks.waitForCompletion,
      recoverCompletion: mocks.recoverCompletion,
    },
  };
});

import {
  BlockchainQueueService,
  backoffForAttempt,
  RETRY_BACKOFF_MS,
} from './blockchain-queue.service.js';
import { NonRetryableBlockchainError } from './web3.service.js';

function makeCandidate(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    moduleId: 10,
    score: 85,
    blockchainStatus: 'pending',
    blockchainAttempts: 0,
    blockchainNonce: null as number | null,
    blockchainSentHashes: null as string | null,
    module: { topic: 'Solidity' },
    ...overrides,
  };
}

/**
 * The claim UPDATE returns the row with the attempt counter ALREADY
 * incremented, plus the exactly-once journal (nonce + sent hashes) read
 * at claim time — that is what decides send vs. recover.
 */
function claimedRow(candidate: ReturnType<typeof makeCandidate>, attempts: number) {
  return [
    {
      id: candidate.id,
      moduleId: candidate.moduleId,
      score: candidate.score,
      blockchainAttempts: attempts,
      blockchainNonce: candidate.blockchainNonce,
      blockchainSentHashes: candidate.blockchainSentHashes,
    },
  ];
}

/** What web3Service.sendCompletion resolves to once the tx is broadcast. */
function sentTx(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    hash: '0xabc',
    nonce: 7,
    data: '0xdeadbeef',
    to: '0xcontract',
    gasLimit: null,
    maxFeePerGas: null,
    maxPriorityFeePerGas: null,
    ...overrides,
  };
}

const receipt = (hash = '0xabc') => ({ hash, blockNumber: 123, gasUsed: '21000' });

/** Make the happy path work: broadcast succeeds, receipt confirms. */
function mockSuccessfulSend(hash = '0xabc', nonce = 7) {
  mocks.sendCompletion.mockResolvedValue(sentTx({ hash, nonce }));
  mocks.waitForCompletion.mockResolvedValue(receipt(hash));
}

describe('backoffForAttempt', () => {
  it('follows the 1min / 5min / 30min schedule', () => {
    expect(backoffForAttempt(1)).toBe(60_000);
    expect(backoffForAttempt(2)).toBe(300_000);
    expect(backoffForAttempt(3)).toBe(1_800_000);
  });

  it('clamps attempts beyond the schedule to the last entry', () => {
    expect(backoffForAttempt(4)).toBe(RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]);
    expect(backoffForAttempt(99)).toBe(1_800_000);
  });

  it('treats out-of-range attempt 0 as the first step', () => {
    expect(backoffForAttempt(0)).toBe(60_000);
  });
});

describe('BlockchainQueueService.processOnce', () => {
  let service: BlockchainQueueService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setCalls.length = 0;
    mocks.returningQueue.length = 0;
    service = new BlockchainQueueService();
  });

  it('confirms a pending record on success (claim → send → journal → confirmed + tx hash)', async () => {
    const candidate = makeCandidate();
    mocks.findMany.mockResolvedValue([candidate]);
    mocks.returningQueue.push(claimedRow(candidate, 1));
    mockSuccessfulSend();

    await service.processOnce();

    // Broadcast with the module's topic; the wait carries the configured
    // tx timeout and the journal callback for fee-bump replacements.
    expect(mocks.sendCompletion).toHaveBeenCalledWith(10, 85, 'Solidity');
    expect(mocks.waitForCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ hash: '0xabc', nonce: 7 }),
      90_000,
      expect.any(Function)
    );

    // claim → journal → final status.
    expect(mocks.setCalls).toHaveLength(3);
    expect(mocks.setCalls[0]).toMatchObject({ blockchainStatus: 'processing' });
    expect(mocks.setCalls[1]).toMatchObject({
      blockchainNonce: 7,
      blockchainSentHashes: '["0xabc"]',
      transactionHash: '0xabc',
    });
    expect(mocks.setCalls[2]).toMatchObject({
      blockchainStatus: 'confirmed',
      transactionHash: '0xabc',
      blockchainError: null,
      blockchainLockedAt: null,
    });
  });

  it('is idempotent: a record claimed elsewhere is skipped without sending', async () => {
    const candidate = makeCandidate();
    mocks.findMany.mockResolvedValue([candidate]);
    // Conditional claim UPDATE matches no row → empty RETURNING.
    mocks.returningQueue.push([]);

    await service.processOnce();

    expect(mocks.sendCompletion).not.toHaveBeenCalled();
    // Only the claim attempt — no status UPDATE afterwards.
    expect(mocks.setCalls).toHaveLength(1);
    expect(mocks.setCalls[0]).toMatchObject({ blockchainStatus: 'processing' });
  });

  it('schedules a retry with exponential backoff on a retryable failure', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T12:00:00Z'));
    try {
      const candidate = makeCandidate();
      mocks.findMany.mockResolvedValue([candidate]);
      mocks.returningQueue.push(claimedRow(candidate, 1)); // first attempt
      mocks.sendCompletion.mockRejectedValue(new Error('Network connection error'));

      await service.processOnce();

      expect(mocks.setCalls).toHaveLength(2);
      const retry = mocks.setCalls[1];
      expect(retry).toMatchObject({
        blockchainStatus: 'failed',
        blockchainError: 'Network connection error',
        blockchainLockedAt: null,
      });
      // Attempt 1 → next attempt in exactly 1 minute.
      expect(retry.blockchainNextAttemptAt).toEqual(
        new Date('2026-06-11T12:01:00Z')
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses the longer backoff steps for later attempts', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T12:00:00Z'));
    try {
      const candidate = makeCandidate({ blockchainStatus: 'failed' });
      mocks.findMany.mockResolvedValue([candidate]);
      mocks.returningQueue.push(claimedRow(candidate, 2)); // second attempt
      mocks.sendCompletion.mockRejectedValue(new Error('RPC down'));

      await service.processOnce();

      // Attempt 2 → +5 minutes.
      expect(mocks.setCalls[1].blockchainNextAttemptAt).toEqual(
        new Date('2026-06-11T12:05:00Z')
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('marks failed_permanent once max attempts are exhausted', async () => {
    const candidate = makeCandidate({ blockchainStatus: 'failed' });
    mocks.findMany.mockResolvedValue([candidate]);
    // Claim increments to 3 = BLOCKCHAIN_QUEUE_MAX_ATTEMPTS in the mock config.
    mocks.returningQueue.push(claimedRow(candidate, 3));
    mocks.sendCompletion.mockRejectedValue(new Error('still failing'));

    await service.processOnce();

    expect(mocks.setCalls[1]).toMatchObject({
      blockchainStatus: 'failed_permanent',
      blockchainError: 'still failing',
      blockchainNextAttemptAt: null,
      blockchainLockedAt: null,
    });
  });

  it('marks failed_permanent immediately on a non-retryable error (contract revert)', async () => {
    const candidate = makeCandidate();
    mocks.findMany.mockResolvedValue([candidate]);
    mocks.returningQueue.push(claimedRow(candidate, 1)); // first attempt
    mocks.sendCompletion.mockRejectedValue(
      new NonRetryableBlockchainError('Contract reverted: bad score')
    );

    await service.processOnce();

    expect(mocks.setCalls[1]).toMatchObject({
      blockchainStatus: 'failed_permanent',
      blockchainError: 'Contract reverted: bad score',
    });
  });

  it('marks failed_permanent without sending when the owning module was deleted', async () => {
    const candidate = makeCandidate({ module: null });
    mocks.findMany.mockResolvedValue([candidate]);
    mocks.returningQueue.push(claimedRow(candidate, 1));

    await service.processOnce();

    expect(mocks.sendCompletion).not.toHaveBeenCalled();
    expect(mocks.setCalls[1]).toMatchObject({
      blockchainStatus: 'failed_permanent',
      blockchainError: 'Owning module no longer exists',
    });
  });

  it('processes records sequentially and one failure does not block the rest', async () => {
    const first = makeCandidate({ id: 1, moduleId: 10 });
    const second = makeCandidate({ id: 2, moduleId: 20, score: 90 });
    mocks.findMany.mockResolvedValue([first, second]);
    mocks.returningQueue.push(claimedRow(first, 1), claimedRow(second, 1));
    mocks.sendCompletion
      .mockRejectedValueOnce(new Error('flaky RPC'))
      .mockResolvedValueOnce(sentTx({ hash: '0xdef', nonce: 8 }));
    mocks.waitForCompletion.mockResolvedValue(receipt('0xdef'));

    await service.processOnce();

    expect(mocks.sendCompletion).toHaveBeenCalledTimes(2);
    // claim#1, failed#1, claim#2, journal#2, confirmed#2
    expect(mocks.setCalls).toHaveLength(5);
    expect(mocks.setCalls[1]).toMatchObject({ blockchainStatus: 'failed' });
    expect(mocks.setCalls[3]).toMatchObject({ blockchainSentHashes: '["0xdef"]' });
    expect(mocks.setCalls[4]).toMatchObject({
      blockchainStatus: 'confirmed',
      transactionHash: '0xdef',
    });
  });

  it('does nothing when there are no eligible records', async () => {
    mocks.findMany.mockResolvedValue([]);

    await service.processOnce();

    expect(mocks.sendCompletion).not.toHaveBeenCalled();
    expect(mocks.setCalls).toHaveLength(0);
  });

  it('reports how many records it picked up', async () => {
    mocks.findMany.mockResolvedValue([]);
    await expect(service.processOnce()).resolves.toBe(0);

    const a = makeCandidate({ id: 'rec-a' });
    const b = makeCandidate({ id: 'rec-b' });
    mocks.findMany.mockResolvedValue([a, b]);
    mocks.returningQueue.push(claimedRow(a, 1), claimedRow(b, 1));
    mockSuccessfulSend();

    await expect(service.processOnce()).resolves.toBe(2);
  });
});

// The crash window this whole design closes: the process dies between
// `sendTransaction` and the UPDATE that records the hash. The row is then
// reclaimed as a stale lock, and a worker that knows nothing about the
// in-flight transaction sends a SECOND one — a duplicate record on an
// append-only contract. So the nonce and hash are written BEFORE the wait,
// and a reclaimed row is resolved from receipts instead of re-sent.
describe('BlockchainQueueService exactly-once journal', () => {
  let service: BlockchainQueueService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setCalls.length = 0;
    mocks.returningQueue.length = 0;
    service = new BlockchainQueueService();
  });

  it('journals hash + nonce BEFORE waiting for the receipt', async () => {
    const candidate = makeCandidate();
    mocks.findMany.mockResolvedValue([candidate]);
    mocks.returningQueue.push(claimedRow(candidate, 1));
    mocks.sendCompletion.mockResolvedValue(sentTx({ hash: '0xaaa', nonce: 42 }));

    // Snapshot the UPDATEs that had already landed when the wait started.
    let updatesBeforeWait: Array<Record<string, unknown>> = [];
    mocks.waitForCompletion.mockImplementation(async () => {
      updatesBeforeWait = mocks.setCalls.map((call) => ({ ...call }));
      return receipt('0xaaa');
    });

    await service.processOnce();

    expect(updatesBeforeWait).toHaveLength(2); // claim + journal
    expect(updatesBeforeWait[1]).toMatchObject({
      blockchainNonce: 42,
      blockchainSentHashes: '["0xaaa"]',
      transactionHash: '0xaaa',
    });
    // The journal must not resolve the record: it is still in flight.
    expect(updatesBeforeWait[1]).not.toHaveProperty('blockchainStatus');
  });

  it('appends a fee-bump replacement hash to the journal while it is in flight', async () => {
    const candidate = makeCandidate();
    mocks.findMany.mockResolvedValue([candidate]);
    mocks.returningQueue.push(claimedRow(candidate, 1));
    mocks.sendCompletion.mockResolvedValue(sentTx({ hash: '0xaaa', nonce: 42 }));
    mocks.waitForCompletion.mockImplementation(
      async (
        _sent: unknown,
        _timeoutMs: number,
        onReplacement: (hash: string) => Promise<void>
      ) => {
        await onReplacement('0xbbb');
        return receipt('0xbbb');
      }
    );

    await service.processOnce();

    // claim → journal(original) → journal(+replacement) → confirmed
    expect(mocks.setCalls).toHaveLength(4);
    expect(mocks.setCalls[2]).toMatchObject({
      blockchainNonce: 42,
      blockchainSentHashes: '["0xaaa","0xbbb"]',
      transactionHash: '0xbbb',
    });
    expect(mocks.setCalls[3]).toMatchObject({
      blockchainStatus: 'confirmed',
      transactionHash: '0xbbb',
    });
  });

  it('keeps the journal when an attempt fails after broadcasting (so the retry can recover it)', async () => {
    const candidate = makeCandidate();
    mocks.findMany.mockResolvedValue([candidate]);
    mocks.returningQueue.push(claimedRow(candidate, 1));
    mocks.sendCompletion.mockResolvedValue(sentTx({ hash: '0xaaa', nonce: 42 }));
    mocks.waitForCompletion.mockRejectedValue(
      new Error('Transaction not confirmed in time (will be retried)')
    );

    await service.processOnce();

    const failure = mocks.setCalls[2];
    expect(failure).toMatchObject({ blockchainStatus: 'failed' });
    // Clearing these would let the retry allocate a fresh nonce next to a
    // transaction that is still in flight — the duplicate we are avoiding.
    expect(failure).not.toHaveProperty('blockchainNonce');
    expect(failure).not.toHaveProperty('blockchainSentHashes');
  });

  it('recovers a reclaimed row from its journal instead of sending again', async () => {
    const candidate = makeCandidate({
      blockchainStatus: 'processing',
      blockchainNonce: 42,
      blockchainSentHashes: '["0xaaa"]',
    });
    mocks.findMany.mockResolvedValue([candidate]);
    mocks.returningQueue.push(claimedRow(candidate, 2));
    mocks.recoverCompletion.mockResolvedValue(receipt('0xaaa'));

    await service.processOnce();

    expect(mocks.sendCompletion).not.toHaveBeenCalled();
    expect(mocks.recoverCompletion).toHaveBeenCalledWith(
      { nonce: 42, hashes: ['0xaaa'], moduleId: 10, score: 85, topic: 'Solidity' },
      90_000,
      expect.any(Function)
    );
    // claim → confirmed, with no new journal write: nothing new was sent.
    expect(mocks.setCalls).toHaveLength(2);
    expect(mocks.setCalls[1]).toMatchObject({
      blockchainStatus: 'confirmed',
      transactionHash: '0xaaa',
    });
  });

  it('confirms a reclaimed row whose journaled transaction had already mined', async () => {
    const candidate = makeCandidate({
      blockchainStatus: 'processing',
      blockchainNonce: 42,
      blockchainSentHashes: '["0xaaa","0xbbb"]',
    });
    mocks.findMany.mockResolvedValue([candidate]);
    mocks.returningQueue.push(claimedRow(candidate, 2));
    // Recovery found the receipt of the second hash.
    mocks.recoverCompletion.mockResolvedValue(receipt('0xbbb'));

    await service.processOnce();

    expect(mocks.recoverCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ hashes: ['0xaaa', '0xbbb'] }),
      90_000,
      expect.any(Function)
    );
    expect(mocks.setCalls[1]).toMatchObject({
      blockchainStatus: 'confirmed',
      transactionHash: '0xbbb',
    });
  });

  it('marks failed_permanent when the journaled transaction reverted on-chain', async () => {
    const candidate = makeCandidate({
      blockchainStatus: 'processing',
      blockchainNonce: 42,
      blockchainSentHashes: '["0xaaa"]',
    });
    mocks.findMany.mockResolvedValue([candidate]);
    mocks.returningQueue.push(claimedRow(candidate, 2));
    mocks.recoverCompletion.mockRejectedValue(
      new NonRetryableBlockchainError('Contract reverted on-chain: 0xaaa')
    );

    await service.processOnce();

    expect(mocks.sendCompletion).not.toHaveBeenCalled();
    expect(mocks.setCalls[1]).toMatchObject({
      blockchainStatus: 'failed_permanent',
      blockchainError: 'Contract reverted on-chain: 0xaaa',
    });
  });

  it('never re-sends when the nonce was consumed by a transaction outside the journal', async () => {
    const candidate = makeCandidate({
      blockchainStatus: 'processing',
      blockchainNonce: 42,
      blockchainSentHashes: '["0xaaa"]',
    });
    mocks.findMany.mockResolvedValue([candidate]);
    mocks.returningQueue.push(claimedRow(candidate, 2));
    mocks.recoverCompletion.mockRejectedValue(
      new NonRetryableBlockchainError(
        'Nonce 42 was consumed by a transaction that is not in the journal ' +
          '(0xaaa) — refusing to resend. Manual check of wallet 0xwallet required.'
      )
    );

    await service.processOnce();

    expect(mocks.sendCompletion).not.toHaveBeenCalled();
    expect(mocks.setCalls[1]).toMatchObject({ blockchainStatus: 'failed_permanent' });
    expect(String(mocks.setCalls[1].blockchainError)).toContain('Manual check');
  });

  it('journals the re-broadcast of a still-pending nonce without a fresh send', async () => {
    const candidate = makeCandidate({
      blockchainStatus: 'processing',
      blockchainNonce: 42,
      blockchainSentHashes: '["0xaaa"]',
    });
    mocks.findMany.mockResolvedValue([candidate]);
    mocks.returningQueue.push(claimedRow(candidate, 2));
    mocks.recoverCompletion.mockImplementation(
      async (
        _journal: unknown,
        _timeoutMs: number,
        onReplacement: (hash: string) => Promise<void>
      ) => {
        // Same nonce, bumped fees → a new hash the journal must learn.
        await onReplacement('0xccc');
        return receipt('0xccc');
      }
    );

    await service.processOnce();

    expect(mocks.sendCompletion).not.toHaveBeenCalled();
    // claim → journal(+re-broadcast) → confirmed
    expect(mocks.setCalls).toHaveLength(3);
    expect(mocks.setCalls[1]).toMatchObject({
      blockchainNonce: 42,
      blockchainSentHashes: '["0xaaa","0xccc"]',
      transactionHash: '0xccc',
    });
    expect(mocks.setCalls[2]).toMatchObject({
      blockchainStatus: 'confirmed',
      transactionHash: '0xccc',
    });
  });

  it('recovers a `failed` row that timed out after broadcasting, not just a stale lock', async () => {
    const candidate = makeCandidate({
      blockchainStatus: 'failed',
      blockchainNonce: 42,
      blockchainSentHashes: '["0xaaa"]',
    });
    mocks.findMany.mockResolvedValue([candidate]);
    mocks.returningQueue.push(claimedRow(candidate, 2));
    mocks.recoverCompletion.mockResolvedValue(receipt('0xaaa'));

    await service.processOnce();

    expect(mocks.sendCompletion).not.toHaveBeenCalled();
    expect(mocks.recoverCompletion).toHaveBeenCalledTimes(1);
  });

  it('treats an unreadable hash journal as "no hashes" and still recovers by nonce', async () => {
    const candidate = makeCandidate({
      blockchainStatus: 'processing',
      blockchainNonce: 42,
      blockchainSentHashes: 'not json',
    });
    mocks.findMany.mockResolvedValue([candidate]);
    mocks.returningQueue.push(claimedRow(candidate, 2));
    mocks.recoverCompletion.mockResolvedValue(receipt('0xaaa'));

    await service.processOnce();

    // The nonce alone is enough to stay safe: recovery falls back to the
    // account nonce check rather than sending a second transaction.
    expect(mocks.sendCompletion).not.toHaveBeenCalled();
    expect(mocks.recoverCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ nonce: 42, hashes: [] }),
      90_000,
      expect.any(Function)
    );
  });
});

// A scale-to-zero Postgres bills a full suspend-window minimum (~5 min on
// Neon's free plan) for EVERY wakeup, so an idle worker's monthly cost is
// set by how many times it polls, not by how cheap each poll is — the old
// double-per-empty-poll backoff with a 30min ceiling still woke the database
// 48×/day and exhausted the compute allowance with zero traffic. New work is
// now pushed via wake() by the enqueueing endpoints, so an empty queue sleeps
// straight to the safety-net ceiling; the only reason to wake earlier is a
// record already parked for a KNOWN future time (retry backoff / stale lock),
// which the loop sleeps exactly up to.
describe('BlockchainQueueService idle scheduling', () => {
  let service: BlockchainQueueService;

  const BASE = 15_000;
  const CEILING = 120_000;
  const STALE_LOCK = 600_000;
  const T0 = new Date('2026-08-19T12:00:00Z');

  /** Millisecond offset from the pinned test clock. */
  const at = (offsetMs: number) => new Date(T0.getTime() + offsetMs);

  /**
   * Configure what nextScheduledWorkAt() finds parked. The two findFirst
   * calls are told apart by the columns they request.
   */
  const parkedWork = ({
    nextRetryAt = null,
    oldestLockAt = null,
  }: { nextRetryAt?: Date | null; oldestLockAt?: Date | null }) => {
    mocks.findFirst.mockImplementation((args?: { columns?: Record<string, boolean> }) => {
      if (args?.columns?.blockchainNextAttemptAt) {
        return Promise.resolve(
          nextRetryAt ? { blockchainNextAttemptAt: nextRetryAt } : undefined
        );
      }
      return Promise.resolve(
        oldestLockAt ? { blockchainLockedAt: oldestLockAt } : undefined
      );
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    mocks.setCalls.length = 0;
    mocks.returningQueue.length = 0;
    // Default: nothing parked for the future.
    mocks.findFirst.mockResolvedValue(undefined);
    service = new BlockchainQueueService();
  });

  afterEach(() => {
    service.stop();
    vi.useRealTimers();
  });

  /** Let the in-flight tick's promise chain settle without advancing time. */
  const settle = () => vi.advanceTimersByTimeAsync(0);

  it('starts at the base interval', async () => {
    mocks.findMany.mockResolvedValue([]);
    expect(service.currentIntervalMs).toBe(BASE);
  });

  it('sleeps straight to the safety-net ceiling after one empty poll', async () => {
    // No gradual ramp: every intermediate poll is a paid database wakeup,
    // and new work does not need to be discovered — it arrives via wake().
    mocks.findMany.mockResolvedValue([]);

    service.start();
    await settle();

    expect(service.currentIntervalMs).toBe(CEILING);
  });

  it('sleeps exactly until a parked retry instead of the full ceiling', async () => {
    mocks.findMany.mockResolvedValue([]);
    parkedWork({ nextRetryAt: at(45_000) });

    service.start();
    await settle();

    expect(service.currentIntervalMs).toBe(45_000);
  });

  it('treats a stale processing lock as scheduled work (crash recovery)', async () => {
    mocks.findMany.mockResolvedValue([]);
    // Locked 9 minutes ago with a 10-minute stale window → reclaimable in 1.
    parkedWork({ oldestLockAt: at(-(STALE_LOCK - 60_000)) });

    service.start();
    await settle();

    expect(service.currentIntervalMs).toBe(60_000);
  });

  it('sleeps until the EARLIEST of retry and stale lock when both are parked', async () => {
    mocks.findMany.mockResolvedValue([]);
    parkedWork({
      nextRetryAt: at(90_000),
      // Reclaimable at +30s — sooner than the retry.
      oldestLockAt: at(-(STALE_LOCK - 30_000)),
    });

    service.start();
    await settle();

    expect(service.currentIntervalMs).toBe(30_000);
  });

  it('clamps an imminent retry to the base interval', async () => {
    mocks.findMany.mockResolvedValue([]);
    parkedWork({ nextRetryAt: at(1_000) });

    service.start();
    await settle();

    expect(service.currentIntervalMs).toBe(BASE);
  });

  it('never sleeps past the ceiling, even when the next retry is farther out', async () => {
    mocks.findMany.mockResolvedValue([]);
    parkedWork({ nextRetryAt: at(CEILING * 5) });

    service.start();
    await settle();

    expect(service.currentIntervalMs).toBe(CEILING);
  });

  it('snaps back to the base interval as soon as work appears', async () => {
    mocks.findMany.mockResolvedValue([]);

    service.start();
    await settle();
    expect(service.currentIntervalMs).toBe(CEILING);

    const candidate = makeCandidate();
    mocks.findMany.mockResolvedValue([candidate]);
    mocks.returningQueue.push(claimedRow(candidate, 1));
    mockSuccessfulSend();

    await vi.advanceTimersByTimeAsync(CEILING);

    expect(service.currentIntervalMs).toBe(BASE);
  });

  it('backs off exponentially when a poll throws, instead of hammering a failing database', async () => {
    // The failure mode that matters: the database is down or over quota.
    // Retrying every 15s makes it worse; the loop must space out.
    mocks.findMany.mockRejectedValue(new Error('connection refused'));

    service.start();
    await settle();
    expect(service.currentIntervalMs).toBe(BASE * 2);

    await vi.advanceTimersByTimeAsync(BASE * 2);
    expect(service.currentIntervalMs).toBe(BASE * 4);
  });

  it('caps the failure backoff at the ceiling', async () => {
    mocks.findMany.mockRejectedValue(new Error('still down'));

    service.start();
    await settle();
    for (let i = 0; i < 10; i += 1) {
      await vi.advanceTimersByTimeAsync(service.currentIntervalMs);
    }

    expect(service.currentIntervalMs).toBe(CEILING);
  });

  it('keeps polling after a failure rather than dying', async () => {
    mocks.findMany.mockRejectedValue(new Error('transient'));

    service.start();
    await settle();
    const callsAfterFirst = mocks.findMany.mock.calls.length;

    await vi.advanceTimersByTimeAsync(service.currentIntervalMs);

    expect(mocks.findMany.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it('stops scheduling once stopped, and resets the interval', async () => {
    mocks.findMany.mockResolvedValue([]);

    service.start();
    await settle();
    await vi.advanceTimersByTimeAsync(service.currentIntervalMs);
    const callsBeforeStop = mocks.findMany.mock.calls.length;

    service.stop();
    expect(service.currentIntervalMs).toBe(BASE);

    await vi.advanceTimersByTimeAsync(CEILING * 4);
    expect(mocks.findMany.mock.calls.length).toBe(callsBeforeStop);
  });

  it('is idempotent: a second start() does not create a parallel loop', async () => {
    mocks.findMany.mockResolvedValue([]);

    service.start();
    await settle();
    service.start();
    await settle();

    const before = mocks.findMany.mock.calls.length;
    await vi.advanceTimersByTimeAsync(service.currentIntervalMs);

    // Exactly one additional poll, not two.
    expect(mocks.findMany.mock.calls.length).toBe(before + 1);
  });

  it('can be restarted after stop() and begins fast again', async () => {
    mocks.findMany.mockResolvedValue([]);

    service.start();
    await settle();
    expect(service.currentIntervalMs).toBe(CEILING);

    service.stop();
    service.start();

    expect(service.currentIntervalMs).toBe(BASE);
  });
});

// wake() is the other half of the sleep-for-hours contract: the endpoints
// that enqueue on-chain work nudge the worker, so a fresh record is picked
// up in milliseconds while an idle deployment leaves the database suspended.
describe('BlockchainQueueService.wake', () => {
  let service: BlockchainQueueService;

  const BASE = 15_000;
  const CEILING = 120_000;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.setCalls.length = 0;
    mocks.returningQueue.length = 0;
    mocks.findFirst.mockResolvedValue(undefined);
    service = new BlockchainQueueService();
  });

  afterEach(() => {
    service.stop();
    vi.useRealTimers();
  });

  const settle = () => vi.advanceTimersByTimeAsync(0);

  it('polls immediately instead of waiting out the idle sleep', async () => {
    mocks.findMany.mockResolvedValue([]);

    service.start();
    await settle(); // idle: parked at the ceiling
    const before = mocks.findMany.mock.calls.length;

    service.wake();
    await settle();

    // Re-polled without any timer advance.
    expect(mocks.findMany.mock.calls.length).toBe(before + 1);
  });

  it('processes a record enqueued mid-sleep right away, at the fast cadence', async () => {
    mocks.findMany.mockResolvedValue([]);
    service.start();
    await settle();
    expect(service.currentIntervalMs).toBe(CEILING);

    const candidate = makeCandidate();
    mocks.findMany.mockResolvedValue([candidate]);
    mocks.returningQueue.push(claimedRow(candidate, 1));
    mockSuccessfulSend();

    service.wake();
    await settle();

    expect(mocks.sendCompletion).toHaveBeenCalledTimes(1);
    expect(service.currentIntervalMs).toBe(BASE);
  });

  it('is remembered when it lands during an in-flight tick (no lost wake)', async () => {
    // A record inserted while the worker's SELECT is already past it would
    // otherwise sleep until the safety net. The wake must be honoured with
    // an immediate re-poll after the in-flight tick finishes.
    let releaseFirstPoll!: (rows: unknown[]) => void;
    mocks.findMany.mockResolvedValue([]);
    mocks.findMany.mockReturnValueOnce(
      new Promise<unknown[]>((resolve) => {
        releaseFirstPoll = resolve;
      })
    );

    service.start(); // boot tick now awaiting findMany
    service.wake(); // lands mid-tick

    releaseFirstPoll([]);
    await settle();
    await settle();

    // Exactly one follow-up poll, scheduled at zero delay.
    expect(mocks.findMany.mock.calls.length).toBe(2);
  });

  it('is a no-op when the worker is stopped', async () => {
    mocks.findMany.mockResolvedValue([]);

    service.wake();
    await settle();

    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
