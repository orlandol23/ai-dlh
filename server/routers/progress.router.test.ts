import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { and, eq, ne } from 'drizzle-orm';

const mocks = vi.hoisted(() => ({
  modulesFindFirst: vi.fn(),
  progressFindFirst: vi.fn(),
  insertValues: vi.fn(),
  insertReturning: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  updateReturning: vi.fn(),
  recordCompletion: vi.fn(),
  progressFindMany: vi.fn(),
}));

// env.ts validates process.env and exits on failure — stub it out so the
// test runs without a real environment.
vi.mock('../utils/env.js', () => ({
  config: {
    NODE_ENV: 'test',
    RATE_LIMIT_QUIZ_SUBMIT_PER_HOUR: 30,
    RATE_LIMIT_AI_GENERATE_PER_HOUR: 10,
    RATE_LIMIT_BLOCKCHAIN_RETRY_PER_HOUR: 10,
  },
  allowedOrigins: [],
  allowedOriginSuffixes: [],
  isProduction: () => false,
  isDevelopment: () => false,
  isTest: () => true,
}));

vi.mock('../db/index.js', () => ({
  db: {
    query: {
      modules: { findFirst: mocks.modulesFindFirst },
      progressRecords: { findFirst: mocks.progressFindFirst, findMany: mocks.progressFindMany },
    },
    insert: vi.fn(() => ({
      values: mocks.insertValues.mockReturnValue({ returning: mocks.insertReturning }),
    })),
    update: vi.fn(() => ({
      set: mocks.updateSet.mockReturnValue({
        where: mocks.updateWhere.mockReturnValue({ returning: mocks.updateReturning }),
      }),
    })),
  },
}));

import { progressRouter } from './progress.router.js';
import { modules, progressRecords } from '../db/schema.js';

function callerForUser(userId: number) {
  return progressRouter.createCaller({
    user: { id: userId },
    req: { headers: {} },
    res: {},
    // Test context only carries what submitQuiz uses.
  } as never);
}

const quizData = [
  // Q1 carries a real explanation so the "explanation pass-through" assertion
  // is meaningful (a null-only fixture could never catch a dropped field).
  { question: 'Q1 — at least ten chars?', options: ['a', 'b', 'c', 'd'], correctAnswer: 0, explanation: 'Because a.' },
  { question: 'Q2 — at least ten chars?', options: ['a', 'b', 'c', 'd'], correctAnswer: 1 },
  { question: 'Q3 — at least ten chars?', options: ['a', 'b', 'c', 'd'], correctAnswer: 2 },
];

describe('progress.submitQuiz ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks() resets call history but NOT mock implementations, so
    // pin the default here to avoid inheriting a stale value from another
    // describe block regardless of test execution order.
    mocks.progressFindFirst.mockResolvedValue(undefined);
  });

  it('queries the module scoped by (id, userId) of the caller', async () => {
    mocks.modulesFindFirst.mockResolvedValue(undefined);
    const caller = callerForUser(1);

    await expect(
      caller.submitQuiz({ moduleId: 99, answers: [0, 1, 2] })
    ).rejects.toThrow(TRPCError);

    expect(mocks.modulesFindFirst).toHaveBeenCalledWith({
      where: and(eq(modules.id, 99), eq(modules.userId, 1)),
    });
  });

  it("rejects another user's module with NOT_FOUND (no id enumeration)", async () => {
    // The ownership filter lives in the query itself, so a module owned by
    // someone else comes back as undefined — same as a nonexistent one.
    mocks.modulesFindFirst.mockResolvedValue(undefined);
    const caller = callerForUser(2);

    const error = await caller
      .submitQuiz({ moduleId: 1, answers: [0, 1, 2] })
      .then(() => null)
      .catch((e: unknown) => e as TRPCError);

    expect(error).toBeInstanceOf(TRPCError);
    expect(error?.code).toBe('NOT_FOUND');
  });

  it('accepts the owner and computes the score (status "none" below 70%)', async () => {
    mocks.modulesFindFirst.mockResolvedValue({
      id: 1,
      userId: 1,
      topic: 'Solidity',
      quizData,
    });
    mocks.insertReturning.mockResolvedValue([{ id: 7, blockchainStatus: 'none' }]);
    const caller = callerForUser(1);

    // 1 of 3 correct → 33%, below the 70% on-chain threshold.
    const result = await caller.submitQuiz({ moduleId: 1, answers: [0, 0, 0] });

    expect(result.score).toBe(33);
    expect(result.passed).toBe(false);
    expect(result.blockchainStatus).toBe('none');
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ blockchainStatus: 'none' })
    );
  });
});

describe('progress.submitQuiz async on-chain queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.modulesFindFirst.mockResolvedValue({
      id: 1,
      userId: 1,
      topic: 'Solidity',
      quizData,
    });
    // No prior payable record → a passing submission enqueues normally.
    mocks.progressFindFirst.mockResolvedValue(undefined);
  });

  it('enqueues a passing score as "pending" and responds without touching the chain', async () => {
    mocks.insertReturning.mockResolvedValue([{ id: 42, blockchainStatus: 'pending' }]);
    const caller = callerForUser(1);

    const result = await caller.submitQuiz({ moduleId: 1, answers: [0, 1, 2] });

    expect(result).toMatchObject({
      recordId: 42,
      score: 100,
      correct: 3,
      total: 3,
      passed: true,
      blockchainStatus: 'pending',
    });
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ blockchainStatus: 'pending' })
    );
    // The mutation must NOT wait for (or trigger) the on-chain write —
    // that's the queue worker's job. No UPDATE happens here either.
    expect(mocks.recordCompletion).not.toHaveBeenCalled();
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });

  it('never leaks blockchainError or a transaction hash in the submit response', async () => {
    mocks.insertReturning.mockResolvedValue([{ id: 43, blockchainStatus: 'pending' }]);
    const caller = callerForUser(1);

    const result = await caller.submitQuiz({ moduleId: 1, answers: [0, 1, 2] });

    expect(result).not.toHaveProperty('blockchainError');
    expect(result).not.toHaveProperty('transactionHash');
  });
});

describe('progress.retryBlockchain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('re-enqueues a failed_permanent record owned by the caller', async () => {
    mocks.updateReturning.mockResolvedValue([{ id: 5 }]);
    const caller = callerForUser(1);

    const result = await caller.retryBlockchain({ recordId: 5 });

    expect(result).toEqual({ recordId: 5, blockchainStatus: 'pending' });
    // Full queue-state reset so the worker starts from attempt 1.
    expect(mocks.updateSet).toHaveBeenCalledWith({
      blockchainStatus: 'pending',
      blockchainAttempts: 0,
      blockchainNextAttemptAt: null,
      blockchainLockedAt: null,
      blockchainError: null,
    });
    // Ownership and state checks live IN the WHERE — one atomic statement.
    expect(mocks.updateWhere).toHaveBeenCalledWith(
      and(
        eq(progressRecords.id, 5),
        eq(progressRecords.userId, 1),
        eq(progressRecords.blockchainStatus, 'failed_permanent')
      )
    );
  });

  it("returns NOT_FOUND for another user's record (conditional update misses)", async () => {
    mocks.updateReturning.mockResolvedValue([]);
    const caller = callerForUser(2);

    const error = await caller
      .retryBlockchain({ recordId: 5 })
      .then(() => null)
      .catch((e: unknown) => e as TRPCError);

    expect(error).toBeInstanceOf(TRPCError);
    expect(error?.code).toBe('NOT_FOUND');
    expect(mocks.updateWhere).toHaveBeenCalledWith(
      and(
        eq(progressRecords.id, 5),
        eq(progressRecords.userId, 2),
        eq(progressRecords.blockchainStatus, 'failed_permanent')
      )
    );
  });

  it('returns NOT_FOUND when the record is not failed_permanent (e.g. still pending)', async () => {
    // Same empty RETURNING — the status predicate in the WHERE missed.
    mocks.updateReturning.mockResolvedValue([]);
    const caller = callerForUser(1);

    await expect(caller.retryBlockchain({ recordId: 9 })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('rejects non-positive record ids at the schema boundary', async () => {
    const caller = callerForUser(1);

    await expect(caller.retryBlockchain({ recordId: 0 })).rejects.toThrow();
    expect(mocks.updateSet).not.toHaveBeenCalled();
  });
});

describe('progress.submitQuiz server-side grading (security P2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.modulesFindFirst.mockResolvedValue({
      id: 1,
      userId: 1,
      topic: 'Solidity',
      quizData,
    });
    // No prior payable record by default.
    mocks.progressFindFirst.mockResolvedValue(undefined);
    mocks.insertReturning.mockResolvedValue([{ id: 7, blockchainStatus: 'pending' }]);
  });

  it('reveals the answer key (incl. explanation) in review[] ONLY after passing', async () => {
    const caller = callerForUser(1);

    // All correct → 100% → pass → answers + explanation revealed.
    const result = await caller.submitQuiz({ moduleId: 1, answers: [0, 1, 2] });

    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.alreadyRecorded).toBe(false);
    expect(result.blockchainStatus).toBe('pending');
    // The real explanation on Q1 proves the field is carried through (not a
    // hardcoded null) — and correctAnswer is the actual key per question.
    expect(result.review).toEqual([
      { isCorrect: true, correctAnswer: 0, explanation: 'Because a.' },
      { isCorrect: true, correctAnswer: 1, explanation: null },
      { isCorrect: true, correctAnswer: 2, explanation: null },
    ]);
  });

  it('withholds the answer key on a FAILING attempt (per-question correctness only)', async () => {
    mocks.insertReturning.mockResolvedValue([{ id: 7, blockchainStatus: 'none' }]);
    const caller = callerForUser(1);

    // Correct on Q1 and Q2, wrong on Q3 → 2/3 = 67% → fail → key withheld.
    const result = await caller.submitQuiz({ moduleId: 1, answers: [0, 1, 0] });

    expect(result.score).toBe(67);
    expect(result.correct).toBe(2);
    expect(result.passed).toBe(false);
    // isCorrect still flows (the user's own grade) but no correct answers /
    // explanations — a deliberate fail cannot harvest the full key.
    expect(result.review).toEqual([
      { isCorrect: true, correctAnswer: null, explanation: null },
      { isCorrect: true, correctAnswer: null, explanation: null },
      { isCorrect: false, correctAnswer: null, explanation: null },
    ]);
    // Defence in depth: the serialized payload must not contain the answer
    // key or the explanation string anywhere.
    const serialized = JSON.stringify(result.review);
    expect(serialized).not.toContain('Because a.');
    // A failing attempt never even checks for an existing payout.
    expect(mocks.progressFindFirst).not.toHaveBeenCalled();
  });

  it('rejects an answers array that does not match the quiz length', async () => {
    const caller = callerForUser(1);

    const error = await caller
      .submitQuiz({ moduleId: 1, answers: [0, 1] })
      .then(() => null)
      .catch((e: unknown) => e as TRPCError);

    expect(error).toBeInstanceOf(TRPCError);
    expect(error?.code).toBe('BAD_REQUEST');
  });
});

describe('progress.submitQuiz on-chain payout farming guard (security P2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.modulesFindFirst.mockResolvedValue({
      id: 1,
      userId: 1,
      topic: 'Solidity',
      quizData,
    });
  });

  it('does NOT enqueue a second payout when the module already has a payable record', async () => {
    // A prior passing submission already owns the payout slot.
    mocks.progressFindFirst.mockResolvedValue({ id: 99 });
    mocks.insertReturning.mockResolvedValue([{ id: 8, blockchainStatus: 'none' }]);
    const caller = callerForUser(1);

    const result = await caller.submitQuiz({ moduleId: 1, answers: [0, 1, 2] });

    expect(result.passed).toBe(true);
    expect(result.alreadyRecorded).toBe(true);
    expect(result.blockchainStatus).toBe('none');
    // The record is saved for history, but with NO new on-chain payout.
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ blockchainStatus: 'none' })
    );
    expect(mocks.insertValues).not.toHaveBeenCalledWith(
      expect.objectContaining({ blockchainStatus: 'pending' })
    );
    // The existence check is scoped to (user, module) AND a non-'none' status.
    expect(mocks.progressFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: and(
          eq(progressRecords.userId, 1),
          eq(progressRecords.moduleId, 1),
          ne(progressRecords.blockchainStatus, 'none')
        ),
        columns: { id: true },
      })
    );
    expect(mocks.recordCompletion).not.toHaveBeenCalled();
  });

  it('still enqueues a payout when the only prior record is a non-payable failed attempt', async () => {
    // A previously FAILED attempt is stored as 'none', which the
    // (ne blockchain_status, 'none') filter excludes — so findFirst returns
    // nothing and a later passing attempt earns its first, legitimate payout.
    mocks.progressFindFirst.mockResolvedValue(undefined);
    mocks.insertReturning.mockResolvedValue([{ id: 10, blockchainStatus: 'pending' }]);
    const caller = callerForUser(1);

    const result = await caller.submitQuiz({ moduleId: 1, answers: [0, 1, 2] });

    expect(result.passed).toBe(true);
    expect(result.alreadyRecorded).toBe(false);
    expect(result.blockchainStatus).toBe('pending');
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ blockchainStatus: 'pending' })
    );
  });

  it('loses the payout race gracefully: a unique violation downgrades the record to "none"', async () => {
    // No payable record seen at check time…
    mocks.progressFindFirst.mockResolvedValue(undefined);
    // …but the 'pending' insert hits the partial unique index (concurrent
    // passing submission won). The fallback insert records it as 'none'.
    mocks.insertReturning
      .mockRejectedValueOnce({ code: '23505' })
      .mockResolvedValueOnce([{ id: 9, blockchainStatus: 'none' }]);
    const caller = callerForUser(1);

    const result = await caller.submitQuiz({ moduleId: 1, answers: [0, 1, 2] });

    expect(result.passed).toBe(true);
    expect(result.alreadyRecorded).toBe(true);
    expect(result.blockchainStatus).toBe('none');
    // First attempt tried 'pending', the retry recorded 'none'.
    expect(mocks.insertValues).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ blockchainStatus: 'pending' })
    );
    expect(mocks.insertValues).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ blockchainStatus: 'none' })
    );
    expect(mocks.recordCompletion).not.toHaveBeenCalled();
  });
});

describe('progress.getUserProgress — joined module carries no answer key', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('excludes quizData from the joined module columns (security P2)', async () => {
    mocks.progressFindMany.mockResolvedValue([]);
    const caller = callerForUser(1);

    await caller.getUserProgress();

    expect(mocks.progressFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        with: { module: { columns: { quizData: false } } },
      })
    );
  });
});
