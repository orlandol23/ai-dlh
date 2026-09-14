import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { Skeleton } from '@/components/atoms/Skeleton';
import { toast } from '@/components/molecules/Toaster';
import { useAuth } from '@/hooks/useAuth';
import { trpc, type RouterOutputs } from '@/lib/trpc';
import { buildQuizReview } from '@/lib/quiz-review';
import { ModuleContextRow } from '@/components/module/ModuleContextRow';
import { ModuleDesk } from '@/components/module/ModuleDesk';
import { EvidenceRail } from '@/components/module/EvidenceRail';
import { QuizView } from '@/components/module/QuizView';
import { ResultView } from '@/components/module/ResultView';
import { resolveModuleEvidence } from '@/components/module/module-evidence';
import {
  resolveRegistrationState,
  type RegistrationState,
} from '@/components/dashboard/registration-states';

/**
 * Quiz submission result. Inferred from tRPC instead of redeclared so any
 * change to the backend mutation shape (new fields, type tightening,
 * removed properties) surfaces here as a compile error rather than a
 * silent runtime mismatch.
 *
 * Security P2: the module's quiz no longer carries `correctAnswer` /
 * `explanation` — the answer key only exists in `QuizResult.review`,
 * returned by the server after grading.
 */
type QuizResult = RouterOutputs['progress']['submitQuiz'];

/**
 * Statuses where the async queue worker is still going to (re)try the
 * on-chain write — the UI shows "registrando na blockchain…" and keeps
 * polling. `failed` is included: it means "will retry after backoff",
 * not a dead end (that's `failed_permanent`).
 */
const CHAIN_IN_PROGRESS = ['pending', 'processing', 'failed'];

/**
 * ModulePage — C3 "Module Desk" composition (docs/DESIGN-SYSTEM.md §4).
 *
 * P1.3 refactor is presentational only. Every query key, mutation payload,
 * invalidation, handler, guard and derived value below is carried over
 * unchanged from the previous implementation; the render tree now composes
 * the new module components:
 * - ModuleContextRow  — compact module context (back, level, time, focus);
 * - ModuleDesk        — eyebrow + display title + 2px rule + 72ch prose + the
 *                       single start/retake action;
 * - EvidenceRail      — module status / score vs threshold / hash + Etherscan
 *                       / retry / next action (desktop side rail, mobile strip);
 * - QuizView          — focused single-question panel (no rail);
 * - ResultView        — outcome figure, registration state, ruled answer review.
 *
 * Focus mode is unchanged: localStorage key `ai_dlh_focus_mode` stays the
 * single source of truth, the flag is mirrored onto [data-focus-mode] for
 * the existing html:has() shell rule, and the rail/context row follow the
 * same conditional-rendering pattern the page already used.
 */
export const ModulePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['module', 'quiz', 'common', 'dashboard']);
  const moduleId = parseInt(id || '0');
  const { user } = useAuth();

  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusMode, setFocusMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('ai_dlh_focus_mode') === 'true';
  });

  // Persist focus-mode preference
  useEffect(() => {
    localStorage.setItem('ai_dlh_focus_mode', String(focusMode));
  }, [focusMode]);

  // Queries
  const utils = trpc.useUtils();
  const moduleQuery = trpc.ai.getModuleById.useQuery({ moduleId });
  const { data: module, isLoading, error: moduleError, refetch: refetchModule } = moduleQuery;
  // submitQuiz responds before the on-chain write happens (async queue on
  // the server) — while the latest record is still being registered, poll
  // so the UI flips to confirmed / failed_permanent without a reload.
  const { data: progress } = trpc.progress.getModuleProgress.useQuery(
    { moduleId },
    {
      refetchInterval: (data) =>
        data && CHAIN_IN_PROGRESS.includes(data.blockchainStatus) ? 5000 : false,
    }
  );

  // Mutation
  const submitMutation = trpc.progress.submitQuiz.useMutation({
    onSuccess: (data) => {
      setIsSubmitting(false);
      setQuizResult(data);
      setShowResults(true);
      // Submitting a quiz changes stats / progress / module-progress —
      // invalidate every query that derives from progress_records so the
      // Dashboard, achievements, and "you already completed this" banner
      // reflect the new state immediately. Without this, the global
      // staleTime in App.tsx would otherwise show stale data for up to 30s.
      void utils.progress.invalidate();
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast.error(t('quiz:submitError'), { description: error.message });
    },
  });

  // Re-enqueue a record the server-side queue gave up on (failed_permanent).
  const retryMutation = trpc.progress.retryBlockchain.useMutation({
    onSuccess: () => {
      toast.success(t('quiz:results.retryQueued'));
      void utils.progress.invalidate();
    },
    onError: (error) => {
      toast.error(t('quiz:results.retryError'), { description: error.message });
    },
  });

  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-background"
        data-focus-mode={focusMode ? 'true' : 'false'}
        role="status"
        aria-busy="true"
        aria-label={t('common:loading')}
      >
        {/* Skeleton approximates the final desk layout (context strip, title
            block, prose column, evidence rail) — no random blocks. */}
        {!focusMode && (
          <div className="border-b border-border bg-card">
            <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-28" />
                <Skeleton className="h-5 w-40" />
              </div>
              <Skeleton className="h-11 w-44" />
            </div>
          </div>
        )}
        <main className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-8 sm:px-6">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
            {!focusMode && (
              <div className="min-w-0 lg:order-2 lg:col-span-3">
                <Skeleton className="h-72 w-full rounded-sm" />
              </div>
            )}
            <div className="min-w-0 lg:order-1 lg:col-span-9">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="mt-3 h-10 w-3/4" />
              <div className="mt-3 h-0.5 w-full bg-border" aria-hidden="true" />
              <Skeleton className="mt-3 h-3 w-48" />
              <div className="mt-8 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/6" />
              </div>
              <Skeleton className="mt-10 h-11 w-44" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (moduleError) {
    // The query's own retry behaviour is untouched (App.tsx retry: 1); this
    // panel only surfaces what failed and a manual refetch, like the
    // dashboard's error rows (v3 §8).
    return (
      <div
        className="min-h-screen bg-background"
        data-focus-mode={focusMode ? 'true' : 'false'}
      >
        {!focusMode && (
          <ModuleContextRow
            level="beginner"
            estimatedTime={0}
            onBack={() => navigate('/dashboard')}
            onFocusEnter={() => setFocusMode(true)}
          />
        )}
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[72ch] px-4 py-12 sm:px-6"
        >
          <div role="alert" className="rounded-sm border border-error-border bg-error-bg p-4">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-error-fg">
              {t('module:errors.loadTitle')}
            </h1>
            <p className="mt-1 break-all font-mono text-xs text-error-fg/80">
              {moduleError.message}
            </p>
            <p className="mt-1 text-xs text-error-fg/80">{t('module:errors.loadHint')}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-11"
              onClick={() => void refetchModule()}
            >
              {t('dashboard:errors.retry')}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (!module) {
    return (
      <div
        className="min-h-screen bg-background"
        data-focus-mode={focusMode ? 'true' : 'false'}
      >
        {!focusMode && (
          <ModuleContextRow
            level="beginner"
            estimatedTime={0}
            onBack={() => navigate('/dashboard')}
            onFocusEnter={() => setFocusMode(true)}
          />
        )}
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto flex min-h-[60vh] w-full max-w-[72ch] items-center px-4 sm:px-6"
        >
          <div role="alert" className="w-full">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {t('module:notFound.title')}
            </h1>
            <Button className="mt-4 h-11" onClick={() => navigate('/dashboard')}>
              {t('module:notFound.back')}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Inferred from tRPC: { question, options }[] — no answer key client-side.
  const quizData = module.quizData;

  const handleStartQuiz = () => {
    setShowQuiz(true);
    setCurrentQuestion(0);
    setSelectedAnswers(new Array(quizData.length).fill(-1));
    setShowResults(false);
    setQuizResult(null);
  };

  const handleSelectAnswer = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < quizData.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (selectedAnswers.includes(-1)) {
      toast.warning(t('quiz:incomplete.title'), {
        description: t('quiz:incomplete.description'),
      });
      return;
    }

    setIsSubmitting(true);
    submitMutation.mutate({
      moduleId,
      answers: selectedAnswers,
    });
  };

  // The record created by THIS submission — getModuleProgress returns the
  // most recent record for the module, so once the post-submit invalidation
  // refetches, its id matches quizResult.recordId. Until then a passing
  // submission is, by definition, still pending on-chain.
  const submittedRecord =
    quizResult && progress && progress.id === quizResult.recordId ? progress : null;
  // When the module's on-chain reward was already claimed by an earlier pass
  // (`alreadyRecorded`), this submission enqueues nothing — skip the chain
  // status UI and show the "already recorded" note instead.
  const chainStatus =
    quizResult?.passed && !quizResult.alreadyRecorded
      ? submittedRecord?.blockchainStatus ?? 'pending'
      : null;
  const confirmedTxHash =
    chainStatus === 'confirmed' ? submittedRecord?.transactionHash ?? null : null;

  // C3 derivations — pure mappings over the exact data above; no new
  // queries, no changed payloads.
  const evidence = resolveModuleEvidence(progress ?? null);
  // Registration state for THIS submission in the results view: resolved by
  // the shared resolver from the same chainStatus/confirmedTxHash the page
  // has always derived (null when the attempt is below threshold or the
  // payout was already claimed by an earlier pass).
  const resultRegistration: RegistrationState | null =
    chainStatus && quizResult
      ? resolveRegistrationState(quizResult.score, chainStatus, confirmedTxHash)
      : null;
  // Review items built per render from the same three sources as before
  // (the previous implementation zipped them twice — hint + list; this is
  // a plain derivation, not a hook, so it stays below the early returns).
  const reviewItems = quizResult
    ? buildQuizReview(quizData, selectedAnswers, quizResult.review)
    : [];
  // VARK profile influence — read from the already-authenticated user; no
  // new query or payload.
  const learningStyleName = user?.learningStyle
    ? t(`vark:styles.${user.learningStyle}.name`, { ns: 'vark' })
    : null;

  return (
    <div
      className="min-h-screen bg-background"
      // P1.1: render-time mirror of the localStorage-backed focus flag. The
      // AppShell reads it via CSS (html:has([data-focus-mode='true']) hides
      // the bar) so focus mode behaves exactly as before — no state
      // management changes.
      data-focus-mode={focusMode ? 'true' : 'false'}
    >
      {/* Context row — the AppShell owns wordmark, nav, identity, language,
          theme and preferences; this row keeps the module's own context.
          Hidden in focus mode, exactly as the previous implementation. */}
      {!focusMode && (
        <ModuleContextRow
          level={module.level}
          estimatedTime={module.estimatedTime}
          onBack={() => navigate('/dashboard')}
          onFocusEnter={() => setFocusMode(true)}
        />
      )}

      <main
        id="main-content"
        tabIndex={-1}
        className={
          focusMode
            ? 'mx-auto w-full max-w-[72ch] px-4 py-12'
            : 'mx-auto w-full max-w-[1200px] px-4 pb-16 pt-8 sm:px-6'
        }
      >
        {/* Quiz — focused single-question panel; the rail is absent (C3). */}
        {showQuiz && !showResults && (
          <QuizView
            moduleTitle={module.title}
            quizData={quizData}
            currentQuestion={currentQuestion}
            selectedAnswers={selectedAnswers}
            isSubmitting={isSubmitting}
            onSelectAnswer={handleSelectAnswer}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onSubmit={handleSubmitQuiz}
          />
        )}

        {/* Result — outcome, registration state and answer review. */}
        {showResults && quizResult && (
          <ResultView
            moduleTitle={module.title}
            topic={module.topic}
            result={quizResult}
            reviewItems={reviewItems}
            registrationState={resultRegistration}
            transactionHash={confirmedTxHash}
            canRetry={resultRegistration === 'failedNeedsAttention'}
            retryDisabled={retryMutation.isLoading || !submittedRecord}
            onRetry={() => {
              if (submittedRecord) retryMutation.mutate({ recordId: submittedRecord.id });
            }}
            onBack={() => navigate('/dashboard')}
            onRetake={handleStartQuiz}
          />
        )}

        {/* Reading desk + evidence rail. Rail first in source so it becomes
            the status strip above the prose below lg; on lg it sits in the
            narrow right column (order-2) beside the 9/12 desk. */}
        {!showQuiz && !showResults && (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
            {!focusMode && (
              <EvidenceRail
                className="lg:order-2 lg:col-span-3"
                evidence={evidence}
                transactionHash={progress?.transactionHash ?? null}
                learningStyleName={learningStyleName}
                onRetry={
                  evidence.state === 'failedNeedsAttention' && progress
                    ? () => retryMutation.mutate({ recordId: progress.id })
                    : undefined
                }
                retryDisabled={retryMutation.isLoading}
              />
            )}
            <div className="min-w-0 lg:order-1 lg:col-span-9">
              <ModuleDesk
                moduleId={module.id}
                title={module.title}
                topic={module.topic}
                level={module.level}
                estimatedTime={module.estimatedTime}
                provider={module.provider}
                content={module.content}
                hasAttempt={!!progress}
                onStartQuiz={handleStartQuiz}
              />
            </div>
          </div>
        )}
      </main>

      {/* Floating exit button — modo focado */}
      {focusMode && (
        <button
          type="button"
          onClick={() => setFocusMode(false)}
          className="fixed bottom-6 end-6 z-40 rounded-full bg-primary px-4 py-2 font-medium text-sm text-primary-foreground shadow-lg transition hover:opacity-90 focus-ring-v2"
          aria-label={t('module:focus.exit')}
        >
          {t('module:focus.exit')}
        </button>
      )}
    </div>
  );
};
