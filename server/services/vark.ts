/**
 * VARK learning-style model — shared, dependency-free domain logic.
 *
 * Ported (concept, not code) from aprendaMais `frontend/js/quiz.js` as
 * Fase 1 of the aprendaMais fusion roadmap. The same
 * deterministic rules are mirrored on the frontend
 * (frontend/src/lib/vark.ts) for instant result display; the server-side
 * computation here is the source of truth for what gets persisted.
 */

export const LEARNING_STYLES = [
  'visual',
  'auditory',
  'reading_writing',
  'kinesthetic',
] as const;

export type LearningStyle = (typeof LEARNING_STYLES)[number];

export type VarkCounts = Record<LearningStyle, number>;

/** Number of questions in the VARK questionnaire. */
export const VARK_QUESTION_COUNT = 15;

/** Type guard for values coming from the DB (learning_style is varchar). */
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
   * by the fixed order visual > auditory > reading_writing > kinesthetic,
   * so the same answers always persist the same style.
   */
  style: LearningStyle;
  /**
   * True when more than one style shares the maximum count — the UI
   * presents this as a "multimodal" profile while the deterministic
   * dominant style above is what gets persisted (the users.learning_style
   * column holds exactly one of the four styles).
   */
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
