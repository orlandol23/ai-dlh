import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { RegistrationMarker } from '@/components/dashboard/RegistrationMarker';
import { type RegistrationState } from '@/components/dashboard/registration-states';
import { answerLetter, type QuizReviewItem } from '@/lib/quiz-review';
import { getEtherscanUrl } from '@/lib/utils';
import { toast } from '@/components/molecules/Toaster';
import type { RouterOutputs } from '@/lib/trpc';

/**
 * Quiz submission result, inferred from tRPC (same rationale as the page:
 * backend shape changes surface as compile errors, not runtime drift).
 */
type QuizResult = RouterOutputs['progress']['submitQuiz'];

/**
 * ResultView — outcome section (v3 C3 results state, W3).
 *
 * Hierarchy: score figure (tabular numerals, ink — the state word and a 4px
 * gutter carry pass/below-threshold; no gradient, no count-up), then the
 * registration state (a separate asynchronous concern), then the answer
 * review as a ruled list, then Retake / Back to dashboard.
 *
 * Behaviour preserved from the previous results screen: the exact
 * chain-state derivation happens in ModulePage (`chainStatus` /
 * `submittedRecord` / `confirmedTxHash`); this component only renders it:
 * - nothing claims an on-chain write before the polled record confirms it;
 * - a failed registration always states that the score was saved;
 * - the already-recorded case stays an informational note (an earlier
 *   attempt owns the payout — this submission enqueued nothing);
 * - Etherscan link + cert share row appear exactly when the hash exists;
 * - the retry action keeps its existing disabled conditions.
 *
 * The old rotated "ON-CHAIN" stamp is replaced by a static seal-like panel
 * (2px ledger-green border) with a reduced-motion-safe opacity settle —
 * no rotation, no scale pop, no hash-grid.
 */
export interface ResultViewProps {
  moduleTitle: string;
  topic: string;
  result: QuizResult;
  reviewItems: QuizReviewItem[];
  /** Resolved registration state for THIS submission (null when none applies). */
  registrationState: RegistrationState | null;
  /** Confirmed transaction hash for THIS submission (null until confirmed). */
  transactionHash: string | null;
  /** True when the record needs attention (retry action rendered). */
  canRetry: boolean;
  /** Existing disabled condition: retry in flight or no record id yet. */
  retryDisabled: boolean;
  onRetry: () => void;
  onBack: () => void;
  onRetake: () => void;
}

const REGISTRATION_SENTENCE_KEY: Record<RegistrationState, string> = {
  queued: 'quiz:results.queuedLine',
  registering: 'quiz:results.blockchainRegisteringTitle',
  retryScheduled: 'quiz:results.retryScheduledLine',
  recorded: 'quiz:results.onChainTitle',
  failedNeedsAttention: 'quiz:results.blockchainFailedTitle',
  // Unreachable in the result branch (below threshold has no registration;
  // no attempt never reaches the results view) — kept total for the map type.
  belowThreshold: 'quiz:results.failedTitle',
  noAttempt: 'quiz:results.failedTitle',
};

export function ResultView({
  moduleTitle,
  topic,
  result,
  reviewItems,
  registrationState,
  transactionHash,
  canRetry,
  retryDisabled,
  onRetry,
  onBack,
  onRetake,
}: ResultViewProps) {
  const { t } = useTranslation(['quiz', 'module', 'cert', 'dashboard', 'common']);
  const reduceMotion = useReducedMotion();

  const passed = result.passed;
  const hasLockedExplanations = reviewItems.some((item) => !item.isCorrect);

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl">
      <h1 className="sr-only">{moduleTitle}</h1>

      {/* Outcome — score is the anchor; ink numerals; state spelled out. */}
      <section aria-labelledby="result-outcome" className="rounded-lg border bg-card">
        <div className="p-6 sm:p-8">
          <p className="eyebrow" id="result-outcome">
            {t('quiz:results.outcomeEyebrow')}
          </p>
          <div
            className={`mt-4 flex flex-wrap items-end gap-x-3 gap-y-1 border-s-4 ps-4 ${
              passed ? 'border-s-success' : 'border-s-error'
            }`}
          >
            <p className="font-display text-6xl font-bold leading-none tracking-tighter tabular-nums text-foreground">
              {result.score}%
            </p>
            <p className="pb-1 font-mono text-sm text-muted-foreground">
              {passed
                ? t('dashboard:timeline.relationPassed')
                : t('dashboard:timeline.relationBelow')}
            </p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {t('quiz:results.correctOfTotal', { correct: result.correct, total: result.total })}
          </p>

          {/* Passed / below threshold — always in words. */}
          <div
            className={`mt-5 rounded-sm border p-4 ${
              passed ? 'border-success-border bg-success-bg' : 'border-error-border bg-error-bg'
            }`}
          >
            <p className={`text-base font-semibold ${passed ? 'text-success-fg' : 'text-error-fg'}`}>
              {passed ? t('quiz:results.passedTitle') : t('quiz:results.failedTitle')}
            </p>
            <p className={`mt-1 text-sm ${passed ? 'text-success-fg/80' : 'text-error-fg/80'}`}>
              {passed ? t('quiz:results.passedDescription') : t('quiz:results.failedDescription')}
            </p>
          </div>

          {/* Registration — a separate asynchronous state. Nothing here
              claims success before the polled record confirms it; failed
              states state that the score was saved. */}
          {registrationState && (
            <div className="mt-5">
              <p className="eyebrow">{t('quiz:results.registrationEyebrow')}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <RegistrationMarker
                  state={registrationState}
                  label={t(
                    `dashboard:timeline.state.${
                      registrationState === 'failedNeedsAttention'
                        ? 'failed'
                        : registrationState
                    }`,
                  )}
                  pulse={registrationState === 'registering'}
                />
                <p
                  className="text-sm font-medium text-foreground"
                  role={
                    registrationState === 'registering'
                      ? 'status'
                      : registrationState === 'failedNeedsAttention'
                        ? 'alert'
                        : undefined
                  }
                >
                  {t(REGISTRATION_SENTENCE_KEY[registrationState])}
                </p>
              </div>

              {canRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 h-11"
                  disabled={retryDisabled}
                  onClick={onRetry}
                >
                  {t('quiz:results.retryBlockchain')}
                </Button>
              )}
            </div>
          )}

          {/* An earlier attempt already owns the on-chain payout — this
              submission recorded only the score. Informational, no "recorded"
              claim for this attempt. */}
          {result.alreadyRecorded && (
            <div className="mt-5 rounded-sm border border-info-border bg-info-bg p-4" role="status">
              <p className="font-semibold text-info-fg">
                {t('quiz:results.alreadyRecordedTitle')}
              </p>
              <p className="mt-1 text-sm text-info-fg/80">
                {t('quiz:results.alreadyRecordedDescription')}
              </p>
            </div>
          )}

          {/* Confirmed evidence — seal-like panel (2px ledger-green border),
              full hash + Etherscan + the existing cert share actions. The
              only motion is a reduced-motion-safe opacity settle. */}
          {transactionHash && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.4 }}
              className="mt-6 rounded-sm border-2 border-success-border bg-success-bg p-6"
            >
              <p className="font-display text-lg font-semibold text-success-fg">
                {t('quiz:results.onChainTitle')}
              </p>
              <p className="mt-1 text-sm text-success-fg/80">
                {t('quiz:results.onChainDescription')}
              </p>
              <p className="mt-3 break-all font-mono text-xs text-success-fg">
                {transactionHash}
              </p>
              <a
                href={getEtherscanUrl(transactionHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-[44px] items-center font-mono text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {t('quiz:results.viewOnEtherscan')}
                <span aria-hidden="true" className="ms-1 inline-block font-mono rtl:rotate-180">
                  →
                </span>
              </a>
              <ResultShareRow topic={topic} score={result.score} txHash={transactionHash} />
            </motion.div>
          )}
        </div>
      </section>

      {/* Answer review — ruled rows, not tinted cards (v3 §9 P6). Correct
          rows carry a green left rule + the word "Correct"; incorrect rows a
          red rule + "Incorrect"; locked rows state the unlock condition in
          text (the server withholds missed explanations until a retake earns
          them — the UI must show that lock, not hide the mechanic). */}
      <section aria-labelledby="review-heading" className="mt-10">
        <h2 id="review-heading" className="text-xl font-semibold tracking-tight text-foreground">
          {t('quiz:review.title')}
        </h2>
        {hasLockedExplanations && (
          <p className="mt-1.5 text-sm text-muted-foreground">{t('quiz:review.lockedHint')}</p>
        )}
        <ol className="mt-4 overflow-hidden rounded-sm border border-border">
          {reviewItems.map((item, index) => (
            <li
              key={index}
              className={`border-t border-border border-s-4 bg-card py-4 pe-4 ps-5 first:border-t-0 ${
                item.isCorrect ? 'border-s-success' : 'border-s-error'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 text-sm font-medium text-foreground">
                  <span className="me-2 font-mono text-muted-foreground">
                    {t('quiz:review.questionLabel', { number: index + 1 })}
                  </span>
                  {item.question}
                </p>
                {/* State word — never colour alone (Badge pairs tone+text). */}
                <Badge variant={item.isCorrect ? 'success' : 'error'} className="shrink-0">
                  {item.isCorrect ? t('quiz:review.correct') : t('quiz:review.incorrect')}
                </Badge>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {t('quiz:review.yourAnswer', {
                  letter: answerLetter(item.selectedAnswer),
                  content: item.options[item.selectedAnswer] ?? '—',
                })}
              </p>
              {/* Explanation only when the server unlocked it (correct rows
                  that have one); missed rows keep the visible lock line. */}
              {item.explanation && (
                <p className="mt-1.5 text-sm text-foreground/90">{item.explanation}</p>
              )}
              {!item.isCorrect && (
                <p className="mt-1.5 font-mono text-xs text-muted-foreground">
                  {t('quiz:review.lockedLine')}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Actions — Retake is the single primary; Back stays outline. */}
      <div className="mt-8 flex flex-wrap justify-center gap-4 pb-2">
        <Button variant="outline" className="h-11" onClick={onBack}>
          {t('quiz:results.backToDashboard')}
        </Button>
        <Button className="h-11" onClick={onRetake}>
          {t('quiz:buttons.retake')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Cert share actions — the exact behaviour of the previous results screen:
 * same cert URL shape (`/cert/:hash?lang=`), same LinkedIn/Twitter intents,
 * same clipboard copy + toast. Extracted verbatim for readability.
 */
function ResultShareRow({ topic, score, txHash }: { topic: string; score: number; txHash: string }) {
  const { t, i18n } = useTranslation(['cert', 'common']);

  const shareText = t('cert:share.text', { topic, score });
  const shareUrl = `${window.location.origin}/cert/${txHash}?lang=${i18n.language}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const linkClasses =
    'inline-flex min-h-[44px] items-center rounded-md border border-input bg-background px-3 text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-ring-v2';
  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success(t('cert:share.copied'));
  };

  return (
    <div className="mt-4 flex flex-wrap justify-center gap-3 border-t border-success-border pt-4">
      <a target="_blank" rel="noopener noreferrer" href={linkedInUrl} className={linkClasses}>
        {t('cert:share.linkedin')}
        <span aria-hidden="true" className="ms-1 inline-block font-mono rtl:rotate-180">
          →
        </span>
      </a>
      <a target="_blank" rel="noopener noreferrer" href={twitterUrl} className={linkClasses}>
        {t('cert:share.twitter')}
      </a>
      <Button variant="outline" size="sm" className="h-11" onClick={copy}>
        {t('cert:share.copyLink')}
      </Button>
    </div>
  );
}
