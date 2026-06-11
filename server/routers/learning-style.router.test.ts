import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

const mocks = vi.hoisted(() => ({
  /** Captures the object passed to db.update(users).set(...). */
  setSpy: vi.fn(),
  returning: vi.fn(),
}));

// env.ts validates process.env and exits on failure — stub it out so the
// test runs without a real environment.
vi.mock('../utils/env.js', () => ({
  config: { NODE_ENV: 'test' },
  allowedOrigins: [],
  allowedOriginSuffixes: [],
  isProduction: () => false,
  isDevelopment: () => false,
  isTest: () => true,
}));

vi.mock('../db/index.js', () => ({
  db: {
    update: vi.fn(() => ({
      set: (vals: Record<string, unknown>) => {
        mocks.setSpy(vals);
        return { where: () => ({ returning: mocks.returning }) };
      },
    })),
  },
}));

import { learningStyleRouter } from './learning-style.router.js';
import type { LearningStyle } from '../services/vark.js';

function caller(userId: number | null = 1) {
  return learningStyleRouter.createCaller({
    user: userId === null ? null : { id: userId },
    req: { headers: {} },
    res: {},
  } as never);
}

/** Builds the 15-answer array from per-style counts (must sum to 15). */
const answers = (v: number, a: number, r: number, k: number): LearningStyle[] => [
  ...Array<LearningStyle>(v).fill('visual'),
  ...Array<LearningStyle>(a).fill('auditory'),
  ...Array<LearningStyle>(r).fill('reading_writing'),
  ...Array<LearningStyle>(k).fill('kinesthetic'),
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.returning.mockResolvedValue([{ id: 1, learningStyle: 'visual' }]);
});

describe('learningStyle.submitVarkResult — persistence', () => {
  it('computes and persists the dominant style from the raw answers', async () => {
    const result = await caller().submitVarkResult({ answers: answers(2, 9, 2, 2) });

    expect(mocks.setSpy).toHaveBeenCalledWith({ learningStyle: 'auditory' });
    expect(result.style).toBe('auditory');
    expect(result.isMultimodal).toBe(false);
    expect(result.counts).toEqual({
      visual: 2,
      auditory: 9,
      reading_writing: 2,
      kinesthetic: 2,
    });
  });

  it('persists the deterministic winner on a tie and flags multimodal', async () => {
    // reading_writing and kinesthetic tied at 6 → fixed order picks R.
    const result = await caller().submitVarkResult({ answers: answers(2, 1, 6, 6) });

    expect(mocks.setSpy).toHaveBeenCalledWith({ learningStyle: 'reading_writing' });
    expect(result.style).toBe('reading_writing');
    expect(result.isMultimodal).toBe(true);
  });

  it('fails with INTERNAL_SERVER_ERROR when the update touches no row', async () => {
    mocks.returning.mockResolvedValue([]);

    const error = await caller()
      .submitVarkResult({ answers: answers(15, 0, 0, 0) })
      .then(() => null)
      .catch((e: unknown) => e as TRPCError);

    expect(error).toBeInstanceOf(TRPCError);
    expect(error?.code).toBe('INTERNAL_SERVER_ERROR');
  });
});

describe('learningStyle.submitVarkResult — Zod input validation', () => {
  it('rejects fewer than 15 answers', async () => {
    await expect(
      caller().submitVarkResult({ answers: answers(7, 7, 0, 0) }), // 14
    ).rejects.toThrow(/exactly 15 questions/);
    expect(mocks.setSpy).not.toHaveBeenCalled();
  });

  it('rejects more than 15 answers', async () => {
    await expect(
      caller().submitVarkResult({ answers: answers(8, 8, 0, 0) }), // 16
    ).rejects.toThrow(/exactly 15 questions/);
    expect(mocks.setSpy).not.toHaveBeenCalled();
  });

  it('rejects values outside the four VARK styles', async () => {
    const invalid = [...answers(14, 0, 0, 0), 'telepathic'] as never;

    await expect(caller().submitVarkResult({ answers: invalid })).rejects.toThrow();
    expect(mocks.setSpy).not.toHaveBeenCalled();
  });

  it('requires authentication (protectedProcedure)', async () => {
    const error = await caller(null)
      .submitVarkResult({ answers: answers(15, 0, 0, 0) })
      .then(() => null)
      .catch((e: unknown) => e as TRPCError);

    expect(error).toBeInstanceOf(TRPCError);
    expect(error?.code).toBe('UNAUTHORIZED');
    expect(mocks.setSpy).not.toHaveBeenCalled();
  });
});

describe('learningStyle.clearLearningStyle', () => {
  it('persists null so the user can retake the questionnaire', async () => {
    mocks.returning.mockResolvedValue([{ id: 1, learningStyle: null }]);

    const result = await caller().clearLearningStyle();

    expect(mocks.setSpy).toHaveBeenCalledWith({ learningStyle: null });
    expect(result.user.learningStyle).toBeNull();
  });
});
