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
 * network tab and farm guaranteed passes.
 *
 * P2 is closed by three layers, all in `progress.submitQuiz`:
 *   1. The quiz ships without the key (this helper) — grading is server-side.
 *   2. The answer + explanation are returned per question ONLY for the ones
 *      the user answered correctly (you can only see an answer you already
 *      got right) — so neither failing on purpose nor retaking after a pass
 *      can harvest the answers to the questions still missed.
 *   3. At most ONE on-chain payout per (user, module) — a partial unique
 *      index (`progress_one_payout_per_module_idx`) makes resubmission
 *      farming impossible even if the answers become known.
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
