/**
 * Post-submit quiz review.
 *
 * The quiz now travels to the client WITHOUT the answer key (security P2 —
 * grading is 100% server-side). The correct answers only arrive in the
 * `progress.submitQuiz` response (`review[]`), so the review screen is built
 * by zipping three sources: the public questions, the user's selected
 * answers, and the server-graded review entries.
 */

export interface PublicQuizQuestion {
  question: string;
  options: string[];
}

export interface ServerReviewEntry {
  correctAnswer: number;
  explanation: string | null;
  isCorrect: boolean;
}

export interface QuizReviewItem {
  question: string;
  options: string[];
  selectedAnswer: number;
  correctAnswer: number;
  explanation: string | null;
  isCorrect: boolean;
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
    correctAnswer: review[i].correctAnswer,
    explanation: review[i].explanation,
    isCorrect: review[i].isCorrect,
  }));
}

/** "0 → A, 1 → B, …" — same convention the quiz options use. */
export function answerLetter(index: number): string {
  return index >= 0 && index <= 25 ? String.fromCharCode(65 + index) : '?';
}
