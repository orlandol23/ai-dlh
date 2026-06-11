import { describe, expect, it } from 'vitest';
import {
  LEARNING_STYLES,
  VARK_QUESTION_COUNT,
  countVarkAnswers,
  computeDominantStyle,
  isLearningStyle,
  type LearningStyle,
} from './vark.js';

const answers = (
  v: number,
  a: number,
  r: number,
  k: number,
): LearningStyle[] => [
  ...Array<LearningStyle>(v).fill('visual'),
  ...Array<LearningStyle>(a).fill('auditory'),
  ...Array<LearningStyle>(r).fill('reading_writing'),
  ...Array<LearningStyle>(k).fill('kinesthetic'),
];

describe('countVarkAnswers', () => {
  it('tallies one point per answer into the right style', () => {
    const counts = countVarkAnswers(answers(5, 4, 3, 3));

    expect(counts).toEqual({
      visual: 5,
      auditory: 4,
      reading_writing: 3,
      kinesthetic: 3,
    });
  });

  it('returns all zeros for an empty answer list', () => {
    expect(countVarkAnswers([])).toEqual({
      visual: 0,
      auditory: 0,
      reading_writing: 0,
      kinesthetic: 0,
    });
  });
});

describe('computeDominantStyle', () => {
  it('picks the style with the highest count', () => {
    const { style, isMultimodal } = computeDominantStyle(
      countVarkAnswers(answers(2, 8, 3, 2)),
    );

    expect(style).toBe('auditory');
    expect(isMultimodal).toBe(false);
  });

  it.each<[LearningStyle]>([
    ['visual'],
    ['auditory'],
    ['reading_writing'],
    ['kinesthetic'],
  ])('detects %s as dominant when it sweeps all answers', (winner) => {
    const all = Array<LearningStyle>(VARK_QUESTION_COUNT).fill(winner);
    const result = computeDominantStyle(countVarkAnswers(all));

    expect(result.style).toBe(winner);
    expect(result.isMultimodal).toBe(false);
  });

  it('flags ties as multimodal and breaks them deterministically (V > A > R > K)', () => {
    // visual and kinesthetic tied at 6
    const result = computeDominantStyle(countVarkAnswers(answers(6, 2, 1, 6)));

    expect(result.isMultimodal).toBe(true);
    expect(result.style).toBe('visual');
  });

  it('breaks a tie not involving visual by the same fixed order', () => {
    // reading_writing and kinesthetic tied at 6
    const result = computeDominantStyle(countVarkAnswers(answers(2, 1, 6, 6)));

    expect(result.isMultimodal).toBe(true);
    expect(result.style).toBe('reading_writing');
  });

  it('is stable: same counts always yield the same result', () => {
    const counts = countVarkAnswers(answers(4, 4, 4, 3));
    const first = computeDominantStyle(counts);
    const second = computeDominantStyle(counts);

    expect(second).toEqual(first);
    expect(first.style).toBe('visual');
    expect(first.isMultimodal).toBe(true);
  });
});

describe('isLearningStyle', () => {
  it('accepts each of the four styles', () => {
    for (const style of LEARNING_STYLES) {
      expect(isLearningStyle(style)).toBe(true);
    }
  });

  it('rejects null, undefined and arbitrary strings', () => {
    expect(isLearningStyle(null)).toBe(false);
    expect(isLearningStyle(undefined)).toBe(false);
    expect(isLearningStyle('multimodal')).toBe(false);
    expect(isLearningStyle('VISUAL')).toBe(false);
    expect(isLearningStyle(42)).toBe(false);
  });
});
