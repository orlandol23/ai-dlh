import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  isConfigured: vi.fn(),
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

vi.mock('./providers/router.js', () => ({
  providerRouter: {
    generate: mocks.generate,
    isConfigured: mocks.isConfigured,
  },
}));

import { aiService } from './ai.service.js';

describe('AIService.testConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('never calls provider generate (unauthenticated /health must not spend LLM quota)', async () => {
    mocks.isConfigured.mockReturnValue(true);

    const ok = await aiService.testConnection();

    expect(ok).toBe(true);
    expect(mocks.isConfigured).toHaveBeenCalledTimes(1);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('returns false when the provider is not configured, still without generating', async () => {
    mocks.isConfigured.mockReturnValue(false);

    const ok = await aiService.testConnection();

    expect(ok).toBe(false);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});

describe('AIService.generateModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to providerRouter.generate and returns content + provider', async () => {
    const content = {
      title: 'A title long enough',
      content: 'c'.repeat(300),
      estimatedTime: 10,
      quiz: [],
    };
    mocks.generate.mockResolvedValue({ result: content, providerUsed: 'gemini' });

    const result = await aiService.generateModule('Topic', 'beginner', 'en', {
      tier: 'default',
      region: 'global',
      locale: 'en',
    });

    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ content, provider: 'gemini' });
  });
});
