import type { Module, QuizQuestion } from '../db/schema.js';

/**
 * Client-safe quiz question — the answer key never travels to the client
 * before submission.
 *
 * Security finding P2 (audit): `getModuleById` used to return the full
 * `quizData`, including `correctAnswer` (and `explanation`, which often
 * paraphrases the correct option). Since every passing submission (>= 70%)
 * triggers an on-chain transaction paid with ETH from the server's
 * custodial wallet, a module owner could read the answer key from the
 * network tab and farm guaranteed passes. Grading already happens
 * server-side in `progress.submitQuiz`; the full answer key is only
 * returned in that mutation's response, for the post-submit review screen.
 */
export type PublicQuizQuestion = Pick<QuizQuestion, 'question' | 'options'>;

export type PublicModule = Omit<Module, 'quizData'> & {
  quizData: PublicQuizQuestion[];
};

/**
 * Strips the answer key (`correctAnswer`) and `explanation` from a module's
 * quiz before it leaves the server. Output-layer only — the DB schema and
 * existing rows are untouched, so already-generated modules keep working.
 */
export function toPublicModule(module: Module): PublicModule {
  return {
    ...module,
    quizData: module.quizData.map(({ question, options }) => ({
      question,
      options,
    })),
  };
}
