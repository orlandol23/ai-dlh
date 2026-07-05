/**
 * Post-submit quiz review.
 *
 * The quiz travels to the client WITHOUT the answer key (security P2 —
 * grading is 100% server-side). The correct answers only arrive in the
 * `progress.submitQuiz` response (`review[]`), and ONLY after a passing
 * submission — on a failing attempt the server sends `correctAnswer`/
 * `explanation` as `null` (the user still sees which questions they missed
 * via `isCorrect`, but not the answers). The review screen is built by
 * zipping three sources: the public questions, the user's selected answers,
 * and the server-graded review entries.
 */

export interface PublicQuizQuestion {
  question: string;
  options: string[];
}

export interface ServerReviewEntry {
  isCorrect: boolean;
  // null when the submission did not pass — the answer key is withheld until
  // the quiz is genuinely passed (security P2).
  correctAnswer: number | null;
  explanation: string | null;
}

export interface QuizReviewItem {
  question: string;
  options: string[];
  selectedAnswer: number;
  isCorrect: boolean;
  // null when withheld (failing attempt) — render the correct answer only
  // when this is non-null.
  correctAnswer: number | null;
  explanation: string | null;
}

/**
 * Merges questions + the user's answers + the server's graded review into
 * display-ready items. Zips by the shortest length so a malformed payload
 * can never throw during render.
 */
export function buildQuizReview(
  questions: readonly PublicQuizQuestion[],
  selectedAnswers: readonly number[],
  review: readonly ServerReviewEntry[]
): QuizReviewItem[] {
  const length = Math.min(questions.length, selectedAnswers.length, review.length);

  return Array.from({ length }, (_, i) => ({
    question: questions[i].question,
    options: questions[i].options,
    selectedAnswer: selectedAnswers[i],
    isCorrect: review[i].isCorrect,
    correctAnswer: review[i].correctAnswer,
    explanation: review[i].explanation,
  }));
}

/** "0 → A, 1 → B, …" — same convention the quiz options use. */
export function answerLetter(index: number): string {
  return index >= 0 && index <= 25 ? String.fromCharCode(65 + index) : '?';
}
