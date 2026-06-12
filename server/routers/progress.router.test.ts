import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';

const mocks = vi.hoisted(() => ({
  modulesFindFirst: vi.fn(),
  insertReturning: vi.fn(),
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
      progressRecords: { findFirst: vi.fn(), findMany: mocks.progressFindMany },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: mocks.insertReturning })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn() })),
    })),
  },
}));

vi.mock('../services/web3.service.js', () => ({
  web3Service: { recordCompletion: mocks.recordCompletion },
}));

import { progressRouter } from './progress.router.js';
import { modules } from '../db/schema.js';

function callerForUser(userId: number) {
  return progressRouter.createCaller({
    user: { id: userId },
    req: { headers: {} },
    res: {},
    // Test context only carries what submitQuiz uses.
  } as never);
}

const quizData = [
  { question: 'Q1 — at least ten chars?', options: ['a', 'b', 'c', 'd'], correctAnswer: 0 },
  { question: 'Q2 — at least ten chars?', options: ['a', 'b', 'c', 'd'], correctAnswer: 1 },
  { question: 'Q3 — at least ten chars?', options: ['a', 'b', 'c', 'd'], correctAnswer: 2 },
];

describe('progress.submitQuiz ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(mocks.recordCompletion).not.toHaveBeenCalled();
  });

  it('accepts the owner and computes the score (no blockchain call below 70%)', async () => {
    mocks.modulesFindFirst.mockResolvedValue({
      id: 1,
      userId: 1,
      topic: 'Solidity',
      quizData,
    });
    mocks.insertReturning.mockResolvedValue([{ id: 7 }]);
    const caller = callerForUser(1);

    // 1 of 3 correct → 33%, below the 70% on-chain threshold.
    const result = await caller.submitQuiz({ moduleId: 1, answers: [0, 0, 0] });

    expect(result.score).toBe(33);
    expect(result.passed).toBe(false);
    expect(result.blockchainError).toBeNull();
    expect(mocks.recordCompletion).not.toHaveBeenCalled();
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
    mocks.insertReturning.mockResolvedValue([{ id: 7 }]);
  });

  it('returns the full answer key (review) with per-question correctness', async () => {
    const caller = callerForUser(1);

    // Correct on Q1 and Q2, wrong on Q3 → 2/3 = 67%.
    const result = await caller.submitQuiz({ moduleId: 1, answers: [0, 1, 0] });

    expect(result.score).toBe(67);
    expect(result.correct).toBe(2);
    expect(result.review).toEqual([
      { correctAnswer: 0, explanation: null, isCorrect: true },
      { correctAnswer: 1, explanation: null, isCorrect: true },
      { correctAnswer: 2, explanation: null, isCorrect: false },
    ]);
  });

  it('server-side score matches the submitted answers (all correct → 100%, on-chain)', async () => {
    mocks.recordCompletion.mockResolvedValue({ hash: '0xabc' });
    const caller = callerForUser(1);

    const result = await caller.submitQuiz({ moduleId: 1, answers: [0, 1, 2] });

    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.transactionHash).toBe('0xabc');
    expect(result.review.every((r) => r.isCorrect)).toBe(true);
    expect(mocks.recordCompletion).toHaveBeenCalledWith(1, 100, 'Solidity');
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
