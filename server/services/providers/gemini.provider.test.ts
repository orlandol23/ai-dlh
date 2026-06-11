import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
}));

// env.ts validates process.env and exits on failure — stub it out so the
// test runs without a real environment (logger pulls config.NODE_ENV).
vi.mock('../../utils/env.js', () => ({
  config: { NODE_ENV: 'test' },
  allowedOrigins: [],
  allowedOriginSuffixes: [],
  isProduction: () => false,
  isDevelopment: () => false,
  isTest: () => true,
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: () => ({ generateContent: mocks.generateContent }),
  })),
}));

// ai.service.ts (imported for ModuleContentSchema) pulls in the provider
// router singleton, which would instantiate every provider at module load
// and trip over the circular import back into this module under test.
vi.mock('./router.js', () => ({ providerRouter: {} }));

import { GeminiProvider } from './gemini.provider.js';
import { ModuleContentSchema } from '../ai.service.js';

/** Minimal module that satisfies every ModuleContentSchema constraint. */
function validModule() {
  return {
    title: 'Introduction to TypeScript Generics',
    content: '## Generics\n' + 'Generics let you write reusable, type-safe code. '.repeat(10),
    estimatedTime: 15,
    quiz: [
      {
        question: 'What does a generic type parameter provide?',
        options: ['Reusability', 'Slower code', 'Runtime checks', 'Nothing'],
        correctAnswer: 0,
        explanation: 'Generics enable reusable type-safe abstractions.',
      },
      {
        question: 'Which syntax declares a generic function?',
        options: ['fn<T>()', 'fn[T]()', 'fn{T}()', 'fn(T)'],
        correctAnswer: 0,
      },
      {
        question: 'When are generic types resolved by the compiler?',
        options: ['At runtime', 'At compile time', 'Never', 'On deploy'],
        correctAnswer: 1,
      },
    ],
  };
}

function geminiRespondsWith(text: string) {
  mocks.generateContent.mockResolvedValue({ response: { text: () => text } });
}

const input = { topic: 'TypeScript', level: 'beginner', locale: 'en' } as const;

let provider: GeminiProvider;

beforeEach(() => {
  vi.clearAllMocks();
  provider = new GeminiProvider('fake-api-key');
});

describe('GeminiProvider.generateModule — response parsing/validation', () => {
  it('returns the parsed module when the AI answers valid JSON', async () => {
    const module = validModule();
    geminiRespondsWith(JSON.stringify(module));

    const result = await provider.generateModule(input);

    expect(result).toEqual(module);
    // And the result is itself schema-valid (belt and suspenders).
    expect(() => ModuleContentSchema.parse(result)).not.toThrow();
  });

  it('throws a handled error (no crash) for malformed JSON', async () => {
    geminiRespondsWith('```json\n{"title": "broken...');

    await expect(provider.generateModule(input)).rejects.toThrow(
      'AI generated invalid JSON format',
    );
  });

  it('throws a handled error for a truncated response (cut-off generation)', async () => {
    const full = JSON.stringify(validModule());
    geminiRespondsWith(full.slice(0, full.length / 2));

    await expect(provider.generateModule(input)).rejects.toThrow(
      'AI generated invalid JSON format',
    );
  });

  it('rejects JSON with missing required fields', async () => {
    const incomplete = validModule() as Partial<ReturnType<typeof validModule>>;
    delete incomplete.quiz;
    geminiRespondsWith(JSON.stringify(incomplete));

    await expect(provider.generateModule(input)).rejects.toThrow(
      /Generated module failed validation/,
    );
  });

  it('rejects a quiz question with correctAnswer out of the 0-3 range', async () => {
    const module = validModule();
    module.quiz[0].correctAnswer = 5;
    geminiRespondsWith(JSON.stringify(module));

    await expect(provider.generateModule(input)).rejects.toThrow(
      /Generated module failed validation/,
    );
  });

  it('rejects a quiz question without exactly 4 options', async () => {
    const module = validModule();
    module.quiz[1].options = ['only', 'three', 'options'];
    geminiRespondsWith(JSON.stringify(module));

    await expect(provider.generateModule(input)).rejects.toThrow(
      /Generated module failed validation/,
    );
  });

  it('rejects a quiz with fewer than 3 questions', async () => {
    const module = validModule();
    module.quiz = module.quiz.slice(0, 2);
    geminiRespondsWith(JSON.stringify(module));

    await expect(provider.generateModule(input)).rejects.toThrow(
      /Generated module failed validation/,
    );
  });

  it('rejects content shorter than the schema floor', async () => {
    const module = validModule();
    module.content = 'Too short.';
    geminiRespondsWith(JSON.stringify(module));

    await expect(provider.generateModule(input)).rejects.toThrow(
      /Generated module failed validation/,
    );
  });
});

describe('GeminiProvider.generateModule — VARK prompt adaptation', () => {
  it('injects the learner-profile adaptation when the user has a learning style', async () => {
    geminiRespondsWith(JSON.stringify(validModule()));

    await provider.generateModule({ ...input, learningStyle: 'kinesthetic' });

    const prompt = mocks.generateContent.mock.calls[0][0] as string;
    expect(prompt).toContain('Learner profile adaptation (VARK)');
    expect(prompt).toContain('KINESTHETIC learner');
  });

  it('omits the adaptation when the user has no learning style', async () => {
    geminiRespondsWith(JSON.stringify(validModule()));

    await provider.generateModule({ ...input, learningStyle: null });

    const prompt = mocks.generateContent.mock.calls[0][0] as string;
    expect(prompt).not.toContain('Learner profile adaptation');
  });
});
