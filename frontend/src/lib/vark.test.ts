import { describe, expect, it } from 'vitest';
import {
  LEARNING_STYLES,
  VARK_QUESTION_COUNT,
  VARK_QUESTION_IDS,
  countVarkAnswers,
  computeDominantStyle,
  isLearningStyle,
  type LearningStyle,
} from './vark';

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

describe('VARK question metadata', () => {
  it('has 15 sequential question ids (matching the i18n keys q1..q15)', () => {
    expect(VARK_QUESTION_IDS).toHaveLength(VARK_QUESTION_COUNT);
    expect(VARK_QUESTION_IDS[0]).toBe(1);
    expect(VARK_QUESTION_IDS[VARK_QUESTION_COUNT - 1]).toBe(15);
  });
});

describe('countVarkAnswers', () => {
  it('tallies one point per answer into the right style', () => {
    expect(countVarkAnswers(answers(5, 4, 3, 3))).toEqual({
      visual: 5,
      auditory: 4,
      reading_writing: 3,
      kinesthetic: 3,
    });
  });
});

describe('computeDominantStyle', () => {
  it('picks the style with the highest count', () => {
    const result = computeDominantStyle(countVarkAnswers(answers(1, 2, 10, 2)));

    expect(result.style).toBe('reading_writing');
    expect(result.isMultimodal).toBe(false);
  });

  it('flags ties as multimodal and breaks them deterministically (V > A > R > K)', () => {
    const tie = computeDominantStyle(countVarkAnswers(answers(0, 7, 1, 7)));

    expect(tie.isMultimodal).toBe(true);
    // auditory wins the tie against kinesthetic by fixed order — the exact
    // same rule the server applies, so the optimistic UI never disagrees
    // with the persisted value.
    expect(tie.style).toBe('auditory');
  });

  it('handles a full four-way distribution without ties', () => {
    const result = computeDominantStyle(countVarkAnswers(answers(6, 4, 3, 2)));

    expect(result.style).toBe('visual');
    expect(result.isMultimodal).toBe(false);
  });
});

describe('isLearningStyle', () => {
  it('accepts the four canonical styles and rejects everything else', () => {
    for (const style of LEARNING_STYLES) {
      expect(isLearningStyle(style)).toBe(true);
    }
    expect(isLearningStyle(null)).toBe(false);
    expect(isLearningStyle('multimodal')).toBe(false);
    expect(isLearningStyle('')).toBe(false);
  });
});
