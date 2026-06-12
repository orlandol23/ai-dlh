import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

const mocks = vi.hoisted(() => ({
  modulesFindFirst: vi.fn(),
  modulesFindMany: vi.fn(),
  insertReturning: vi.fn(),
  generateModule: vi.fn(),
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
      modules: {
        findFirst: mocks.modulesFindFirst,
        findMany: mocks.modulesFindMany,
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: mocks.insertReturning })),
    })),
    delete: vi.fn(() => ({ where: vi.fn() })),
  },
}));

// The AI service pulls in provider SDKs at import time — mock the whole
// module so these router tests stay hermetic.
vi.mock('../services/ai.service.js', () => ({
  aiService: { generateModule: mocks.generateModule },
}));

import { aiRouter } from './ai.router.js';

function callerForUser(userId: number) {
  return aiRouter.createCaller({
    user: { id: userId, preferredTier: 'default', learningStyle: null },
    req: { headers: {} },
    res: {},
    // Test context only carries what the router uses.
  } as never);
}

/** A module as stored in the DB — quizData WITH the answer key. */
const storedModule = {
  id: 1,
  userId: 1,
  title: 'Intro to Solidity',
  content: '# Markdown content',
  topic: 'Solidity',
  level: 'beginner',
  locale: 'pt-BR',
  provider: 'gemini',
  estimatedTime: 15,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  quizData: [
    {
      question: 'Q1 — at least ten chars?',
      options: ['a', 'b', 'c', 'd'],
      correctAnswer: 0,
      explanation: 'Because a.',
    },
    {
      question: 'Q2 — at least ten chars?',
      options: ['a', 'b', 'c', 'd'],
      correctAnswer: 2,
    },
  ],
};

describe('ai.getModuleById — answer key never leaves the server (security P2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the quiz WITHOUT correctAnswer and explanation', async () => {
    mocks.modulesFindFirst.mockResolvedValue(storedModule);
    const caller = callerForUser(1);

    const result = await caller.getModuleById({ moduleId: 1 });

    for (const q of result.quizData) {
      expect(q).not.toHaveProperty('correctAnswer');
      expect(q).not.toHaveProperty('explanation');
    }
    // Belt and braces: nothing in the serialized payload reveals the key.
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('correctAnswer');
    expect(serialized).not.toContain('explanation');
  });

  it('keeps question/options intact, so existing DB modules still work', async () => {
    mocks.modulesFindFirst.mockResolvedValue(storedModule);
    const caller = callerForUser(1);

    const result = await caller.getModuleById({ moduleId: 1 });

    expect(result.quizData).toEqual([
      { question: 'Q1 — at least ten chars?', options: ['a', 'b', 'c', 'd'] },
      { question: 'Q2 — at least ten chars?', options: ['a', 'b', 'c', 'd'] },
    ]);
    // Non-quiz fields are untouched.
    expect(result.title).toBe(storedModule.title);
    expect(result.content).toBe(storedModule.content);
  });

  it("still forbids access to another user's module", async () => {
    mocks.modulesFindFirst.mockResolvedValue(storedModule);
    const caller = callerForUser(2);

    const error = await caller
      .getModuleById({ moduleId: 1 })
      .then(() => null)
      .catch((e: unknown) => e as TRPCError);

    expect(error).toBeInstanceOf(TRPCError);
    expect(error?.code).toBe('FORBIDDEN');
  });
});

describe('ai.getUserModules — same output sanitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('strips the answer key from every module in the list', async () => {
    mocks.modulesFindMany.mockResolvedValue([
      storedModule,
      { ...storedModule, id: 2 },
    ]);
    const caller = callerForUser(1);

    const result = await caller.getUserModules();

    expect(result).toHaveLength(2);
    expect(JSON.stringify(result)).not.toContain('correctAnswer');
  });
});

describe('ai.generateModule — sanitized on the way out, full quiz in the DB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists the full quiz but returns it without the answer key', async () => {
    mocks.generateModule.mockResolvedValue({
      provider: 'gemini',
      content: {
        title: storedModule.title,
        content: storedModule.content,
        quiz: storedModule.quizData,
        estimatedTime: storedModule.estimatedTime,
      },
    });
    mocks.insertReturning.mockResolvedValue([storedModule]);
    const caller = callerForUser(1);

    const result = await caller.generateModule({
      topic: 'Solidity',
      level: 'beginner',
      locale: 'pt-BR',
    });

    expect(JSON.stringify(result)).not.toContain('correctAnswer');
    expect(result.quizData[0]).toEqual({
      question: 'Q1 — at least ten chars?',
      options: ['a', 'b', 'c', 'd'],
    });
  });
});
