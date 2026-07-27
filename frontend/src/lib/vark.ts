/**
 * VARK learning-style model — frontend mirror of server/services/vark.ts.
 *
 * Ported (concept, not code) from aprendaMais `frontend/js/quiz.js` as
 * Fase 1 of the aprendaMais fusion roadmap. The
 * frontend computes the result only for instant display; the persisted
 * value always comes from `learningStyle.submitVarkResult`, which applies
 * the exact same deterministic rules server-side on the raw answers.
 *
 * Question/option *texts* live in the i18n namespace `vark`
 * (public/locales/{lng}/vark.json) under `questions.q{n}.text` and
 * `questions.q{n}.options.{style}`; this module only carries the
 * structural metadata (ids and the per-question option order).
 */

export const LEARNING_STYLES = [
  'visual',
  'auditory',
  'reading_writing',
  'kinesthetic',
] as const;

export type LearningStyle = (typeof LEARNING_STYLES)[number];

export type VarkCounts = Record<LearningStyle, number>;

export const VARK_QUESTION_COUNT = 15;

/**
 * Question ids 1..15. Every question offers exactly one option per style,
 * in the canonical V/A/R/K order (same structure as the original
 * aprendaMais questionnaire, where options A-D always mapped to
 * visual/auditory/reading/kinesthetic respectively).
 */
export const VARK_QUESTION_IDS: readonly number[] = Array.from(
  { length: VARK_QUESTION_COUNT },
  (_, i) => i + 1,
);

/** Type guard for values coming from the API (learning_style is varchar). */
export function isLearningStyle(value: unknown): value is LearningStyle {
  return (
    typeof value === 'string' &&
    (LEARNING_STYLES as readonly string[]).includes(value)
  );
}

/** Tally one answer per question into per-style counts. */
export function countVarkAnswers(answers: readonly LearningStyle[]): VarkCounts {
  const counts: VarkCounts = {
    visual: 0,
    auditory: 0,
    reading_writing: 0,
    kinesthetic: 0,
  };
  for (const answer of answers) {
    counts[answer] += 1;
  }
  return counts;
}

export interface VarkResult {
  /**
   * Dominant style. Ties on the maximum count are broken deterministically
   * by the fixed order visual > auditory > reading_writing > kinesthetic —
   * identical to the server rule, so the optimistic display can never
   * disagree with what gets persisted.
   */
  style: LearningStyle;
  /** True when more than one style shares the maximum count (multimodal). */
  isMultimodal: boolean;
}

/** Compute the dominant style from per-style counts. */
export function computeDominantStyle(counts: VarkCounts): VarkResult {
  let max = -1;
  let style: LearningStyle = LEARNING_STYLES[0];
  for (const candidate of LEARNING_STYLES) {
    if (counts[candidate] > max) {
      max = counts[candidate];
      style = candidate;
    }
  }
  const isMultimodal =
    LEARNING_STYLES.filter((s) => counts[s] === max).length > 1;
  return { style, isMultimodal };
}
