import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { cn } from '@/lib/utils';
import type { PublicQuizQuestion } from '@/lib/quiz-review';

/**
 * QuizView — focused single-question panel (v3 C3 quiz state, W3).
 *
 * Presentation-only refactor of the existing quiz mode. Preserved from the
 * previous implementation: question ordering, the selected-answer state,
 * the previous/next flow, the submit guard, radio-group semantics
 * (role="radiogroup" + role="radio" + aria-checked + per-option aria-label,
 * Space/Enter activation via real buttons), the disabled/loading logic and
 * the exact spinner SVG. Keyboard behaviour is unchanged (tabbable options;
 * arrow-key roving was not implemented before and is not added here).
 *
 * Visual rules applied (v3 §7): mono question counter, progress track with
 * a solid teal fill (no gradient), full-width options where the selected
 * state is a teal border + 10% fill + inverted letter chip, focus kept
 * distinct from selection (ring appears only on focus-visible), 44px+ touch
 * targets.
 */
export interface QuizViewProps {
  moduleTitle: string;
  quizData: PublicQuizQuestion[];
  currentQuestion: number;
  selectedAnswers: number[];
  isSubmitting: boolean;
  onSelectAnswer: (answerIndex: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function QuizView({
  moduleTitle,
  quizData,
  currentQuestion,
  selectedAnswers,
  isSubmitting,
  onSelectAnswer,
  onPrevious,
  onNext,
  onSubmit,
}: QuizViewProps) {
  const { t } = useTranslation('quiz');

  const total = quizData.length;
  const currentQ = quizData[currentQuestion];
  const selected = selectedAnswers[currentQuestion];
  const progressPercentage = ((currentQuestion + 1) / total) * 100;
  const isLast = currentQuestion === total - 1;

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Reading mode owns the visible h1; in quiz mode the title stays
          available to the outline without competing with the question. */}
      <h1 className="sr-only">{moduleTitle}</h1>

      <div className="rounded-lg border bg-card text-card-foreground">
        <div className="p-6 sm:p-8">
          {/* Progress + question heading. The live region announces the
              question change when navigating (nav controls live outside it,
              so focus is never inside the announced area). */}
          <div aria-live="polite">
            <p className="eyebrow">
              {t('progressLabel', { current: currentQuestion + 1, total })}
            </p>
            <div
              className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={total}
              aria-valuenow={currentQuestion + 1}
            >
              {/* Solid teal fill — no gradient (v3 §7 progress). */}
              <div
                className="h-full bg-primary transition-[width] duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <h2
              id="question-title"
              className="mt-6 font-display text-2xl font-semibold tracking-tight text-foreground"
            >
              {currentQ.question}
            </h2>
          </div>

          {/* Same accessible structure as before: radiogroup + radio buttons
              with aria-checked and the full "Option A: …" label. */}
          <div className="mt-6 space-y-3" role="radiogroup" aria-labelledby="question-title">
            {currentQ.options.map((option, index) => {
              const letter = String.fromCharCode(65 + index);
              const isSelected = selected === index;
              return (
                <button
                  key={index}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={t('option.aria', { letter, content: option })}
                  onClick={() => onSelectAnswer(index)}
                  className={cn(
                    'flex min-h-[44px] w-full items-center gap-3 rounded-lg border px-4 py-3 text-start transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-input bg-card hover:border-border-strong hover:bg-accent',
                  )}
                >
                  {/* Letter chip — selected state is also carried by the
                      inverted chip, never by colour alone. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border font-mono text-xs font-semibold',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground',
                    )}
                  >
                    {letter}
                  </span>
                  <span className="text-sm sm:text-base">{option}</span>
                </button>
              );
            })}
          </div>

          {/* Navigation — same ordering, guards and labels as before. */}
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              className="h-11"
              onClick={onPrevious}
              disabled={currentQuestion === 0}
            >
              <span aria-hidden="true" className="me-1 inline-block font-mono rtl:rotate-180">
                ←
              </span>
              {t('buttons.previous')}
            </Button>

            {isLast ? (
              <Button
                className={cn('h-11', isSubmitting && 'cursor-wait opacity-70')}
                onClick={onSubmit}
                disabled={selectedAnswers.includes(-1) || isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-5 w-5 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>{t('buttons.processing')}</span>
                  </span>
                ) : (
                  t('buttons.finish')
                )}
              </Button>
            ) : (
              <Button className="h-11" onClick={onNext} disabled={selected === -1}>
                {t('buttons.next')}
                <span aria-hidden="true" className="ms-1 inline-block font-mono rtl:rotate-180">
                  →
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
