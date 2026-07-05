import { describe, it, expect } from 'vitest';
import { buildQuizReview, answerLetter } from './quiz-review';

const questions = [
  { question: 'Q1?', options: ['a', 'b', 'c', 'd'] },
  { question: 'Q2?', options: ['e', 'f', 'g', 'h'] },
  { question: 'Q3?', options: ['i', 'j', 'k', 'l'] },
];

const review = [
  { correctAnswer: 0, explanation: 'Because a.', isCorrect: true },
  { correctAnswer: 1, explanation: null, isCorrect: false },
  { correctAnswer: 2, explanation: null, isCorrect: true },
];

describe('buildQuizReview', () => {
  it('zips questions, selected answers and server review into display items', () => {
    const items = buildQuizReview(questions, [0, 3, 2], review);

    expect(items).toEqual([
      {
        question: 'Q1?',
        options: ['a', 'b', 'c', 'd'],
        selectedAnswer: 0,
        correctAnswer: 0,
        explanation: 'Because a.',
        isCorrect: true,
      },
      {
        question: 'Q2?',
        options: ['e', 'f', 'g', 'h'],
        selectedAnswer: 3,
        correctAnswer: 1,
        explanation: null,
        isCorrect: false,
      },
      {
        question: 'Q3?',
        options: ['i', 'j', 'k', 'l'],
        selectedAnswer: 2,
        correctAnswer: 2,
        explanation: null,
        isCorrect: true,
      },
    ]);
  });

  it('trusts the server verdict (isCorrect), not a client-side comparison', () => {
    // Even if the client state were tampered with, the rendered verdict is
    // the one graded server-side.
    const items = buildQuizReview(questions, [1, 1, 1], [
      { correctAnswer: 0, explanation: null, isCorrect: false },
      { correctAnswer: 1, explanation: null, isCorrect: true },
      { correctAnswer: 2, explanation: null, isCorrect: false },
    ]);

    expect(items.map((i) => i.isCorrect)).toEqual([false, true, false]);
  });

  it('zips by the shortest length so malformed payloads cannot throw', () => {
    expect(buildQuizReview(questions, [0], review)).toHaveLength(1);
    expect(buildQuizReview(questions, [0, 1, 2], review.slice(0, 2))).toHaveLength(2);
    expect(buildQuizReview([], [0, 1, 2], review)).toEqual([]);
  });

  it('passes through a withheld answer key (null) from a failing attempt', () => {
    // On a failing submission the server sends correctAnswer/explanation as
    // null (security P2). The helper must carry that through untouched so the
    // UI can simply skip the "correct answer" line.
    const withheld = [
      { correctAnswer: null, explanation: null, isCorrect: true },
      { correctAnswer: null, explanation: null, isCorrect: false },
      { correctAnswer: null, explanation: null, isCorrect: true },
    ];

    const items = buildQuizReview(questions, [0, 1, 2], withheld);

    expect(items.map((i) => i.correctAnswer)).toEqual([null, null, null]);
    expect(items.map((i) => i.explanation)).toEqual([null, null, null]);
    expect(items.map((i) => i.isCorrect)).toEqual([true, false, true]);
  });

  it('passes an out-of-range correctAnswer through without throwing', () => {
    // The helper does not bounds-check correctAnswer; the component guards the
    // lookup with `options[correctAnswer] ?? '—'`. Confirm the passthrough is
    // safe (no throw, no clamping) so that guard is the single source of truth.
    const oob = [
      { correctAnswer: 9, explanation: null, isCorrect: false },
      { correctAnswer: 1, explanation: null, isCorrect: true },
      { correctAnswer: 2, explanation: null, isCorrect: true },
    ];

    const items = buildQuizReview(questions, [0, 1, 2], oob);

    expect(items[0].correctAnswer).toBe(9);
    expect(items[0].options[items[0].correctAnswer as number]).toBeUndefined();
  });
});

describe('answerLetter', () => {
  it('maps 0-based indices to option letters', () => {
    expect(answerLetter(0)).toBe('A');
    expect(answerLetter(1)).toBe('B');
    expect(answerLetter(3)).toBe('D');
  });

  it('falls back to "?" for out-of-range indices', () => {
    expect(answerLetter(-1)).toBe('?');
    expect(answerLetter(26)).toBe('?');
  });
});
