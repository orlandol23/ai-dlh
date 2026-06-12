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
