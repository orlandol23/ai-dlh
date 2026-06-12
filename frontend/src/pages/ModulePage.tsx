import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Skeleton } from '@/components/atoms/Skeleton';
import { ThemeToggle } from '@/components/atoms/ThemeToggle';
import { LanguageSelector } from '@/components/molecules/LanguageSelector';
import { toast } from '@/components/molecules/Toaster';
import { trpc, type RouterOutputs } from '@/lib/trpc';
import { getEtherscanUrl } from '@/lib/utils';
import { buildQuizReview, answerLetter } from '@/lib/quiz-review';
import ReactMarkdown from 'react-markdown';

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

export const ModulePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['module', 'quiz', 'common', 'cert']);
  const reduceMotion = useReducedMotion();
  const moduleId = parseInt(id || '0');

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
  const { data: module, isLoading } = trpc.ai.getModuleById.useQuery({ moduleId });
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
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-10 w-32" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-3 mt-8">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </main>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('module:notFound.title')}</h1>
          <Button onClick={() => navigate('/dashboard')}>
            {t('module:notFound.back')}
          </Button>
        </div>
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

  const progressPercentage = ((currentQuestion + 1) / quizData.length) * 100;
  const currentQ = quizData[currentQuestion];

  // The record created by THIS submission — getModuleProgress returns the
  // most recent record for the module, so once the post-submit invalidation
  // refetches, its id matches quizResult.recordId. Until then a passing
  // submission is, by definition, still pending on-chain.
  const submittedRecord =
    quizResult && progress && progress.id === quizResult.recordId ? progress : null;
  const chainStatus = quizResult?.passed
    ? submittedRecord?.blockchainStatus ?? 'pending'
    : null;
  const confirmedTxHash =
    chainStatus === 'confirmed' ? submittedRecord?.transactionHash ?? null : null;

  return (
    <div className={`min-h-screen bg-background ${focusMode ? 'hash-grid' : ''}`}>
      {/* Header — escondido em modo focado */}
      {!focusMode && (
        <header className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                <span className="font-mono inline-block rtl:rotate-180 me-1">←</span>
                {t('module:header.back')}
              </Button>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    module.level === 'beginner'
                      ? 'success'
                      : module.level === 'intermediate'
                      ? 'warning'
                      : 'error'
                  }
                >
                  {t(`module:level.${module.level}`)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {module.estimatedTime} {t('module:header.minutes')}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFocusMode(true)}
                  aria-label={t('module:focus.enter')}
                >
                  {t('module:focus.enter')}
                </Button>
                <LanguageSelector />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>
      )}

      <main
        id="main-content"
        tabIndex={-1}
        className={focusMode ? 'mx-auto px-4 py-12 max-w-2xl' : 'container mx-auto px-4 py-8'}
      >
        <div className="max-w-4xl mx-auto">
          {/* Module Content */}
          {!showQuiz && !showResults && (
            <>
              <div className="mb-8">
                <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">{module.title}</h1>
                <p className="text-muted-foreground">{t('module:topicLabel', { topic: module.topic })}</p>
              </div>

              <Card className="mb-8">
                <CardContent className="pt-6">
                  <div className="prose prose-lg max-w-none">
                    <ReactMarkdown>{module.content}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>

              {progress && !focusMode && (
                <Card className="mb-4 bg-info-bg border-info-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-info-fg">
                          {t('module:alreadyCompleted.title')}
                        </p>
                        <p className="text-sm text-info-fg/80">
                          {t('module:alreadyCompleted.scoreLine', {
                            score: progress.score,
                            result:
                              progress.score >= 70
                                ? t('module:alreadyCompleted.passed')
                                : t('module:alreadyCompleted.failed'),
                          })}
                        </p>
                        {CHAIN_IN_PROGRESS.includes(progress.blockchainStatus) && (
                          <p className="text-sm text-info-fg/80 mt-1" role="status">
                            ⏳ {t('quiz:results.blockchainRegisteringTitle')}
                          </p>
                        )}
                      </div>
                      {progress.blockchainStatus === 'confirmed' && progress.transactionHash && (
                        <a
                          href={getEtherscanUrl(progress.transactionHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm font-mono"
                        >
                          {t('module:alreadyCompleted.viewOnBlockchain')}{' '}
                          <span className="font-mono inline-block rtl:rotate-180">→</span>
                        </a>
                      )}
                      {progress.blockchainStatus === 'failed_permanent' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={retryMutation.isLoading}
                          onClick={() => retryMutation.mutate({ recordId: progress.id })}
                        >
                          {t('quiz:results.retryBlockchain')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-center">
                <Button size="lg" onClick={handleStartQuiz}>
                  {progress ? t('module:retakeQuiz') : t('module:startQuiz')}{' '}
                  <span className="font-mono inline-block rtl:rotate-180">→</span>
                </Button>
              </div>
            </>
          )}

          {/* Quiz */}
          {showQuiz && !showResults && (
            <Card>
              <CardHeader>
                <div className="mb-4">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300 bg-gradient-to-r from-primary to-accent"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('quiz:progressLabel', { current: currentQuestion + 1, total: quizData.length })}
                  </p>
                </div>
                <CardTitle id="question-title">{currentQ.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6" role="radiogroup" aria-labelledby="question-title">
                  {currentQ.options.map((option, index) => {
                    const letter = String.fromCharCode(65 + index);
                    return (
                      <button
                        key={index}
                        type="button"
                        role="radio"
                        aria-checked={selectedAnswers[currentQuestion] === index}
                        aria-label={t('quiz:option.aria', { letter, content: option })}
                        onClick={() => handleSelectAnswer(index)}
                        className={`w-full text-left px-4 py-3 border rounded-lg transition focus-ring-v2 ${
                          selectedAnswers[currentQuestion] === index
                            ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
                            : 'hover:bg-muted border-border'
                        }`}
                      >
                        <span className="font-medium mr-2" aria-hidden="true">
                          {letter}.
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentQuestion === 0}
                  >
                    <span className="font-mono inline-block rtl:rotate-180 me-1">←</span>
                    {t('quiz:buttons.previous')}
                  </Button>

                  {currentQuestion < quizData.length - 1 ? (
                    <Button
                      onClick={handleNext}
                      disabled={selectedAnswers[currentQuestion] === -1}
                    >
                      {t('quiz:buttons.next')}{' '}
                      <span className="font-mono inline-block rtl:rotate-180">→</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmitQuiz}
                      disabled={selectedAnswers.includes(-1) || isSubmitting}
                      className={isSubmitting ? 'opacity-70 cursor-wait' : ''}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>{t('quiz:buttons.processing')}</span>
                        </div>
                      ) : (
                        t('quiz:buttons.finish')
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {showResults && quizResult && (
            <div className="text-center space-y-6">
              <Card>
                <CardContent className="pt-8 pb-8">
                  <div className="mb-6">
                    <div
                      className={`font-display text-7xl font-bold tracking-tighter tabular-nums mb-2 ${
                        quizResult.passed ? 'text-success' : 'text-error'
                      }`}
                    >
                      {quizResult.score}%
                    </div>
                    <p className="text-xl text-muted-foreground">
                      {t('quiz:results.correctOfTotal', {
                        correct: quizResult.correct,
                        total: quizResult.total,
                      })}
                    </p>
                  </div>

                  {quizResult.passed ? (
                    <div className="bg-success-bg border border-success-border rounded-lg p-6">
                      <p className="text-xl font-semibold text-success-fg mb-2">
                        {t('quiz:results.passedTitle')}
                      </p>
                      <p className="text-success-fg/80">
                        {t('quiz:results.passedDescription')}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-error-bg border border-error-border rounded-lg p-6">
                      <p className="text-xl font-semibold text-error-fg mb-2">
                        {t('quiz:results.failedTitle')}
                      </p>
                      <p className="text-error-fg/80">
                        {t('quiz:results.failedDescription')}
                      </p>
                    </div>
                  )}

                  {/* On-chain status — driven by the polled progress record, since
                      submitQuiz now returns before the (async) blockchain write. */}
                  {chainStatus && CHAIN_IN_PROGRESS.includes(chainStatus) && (
                    <div
                      className="mt-6 bg-info-bg border border-info-border rounded-lg p-6"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="flex items-center justify-center gap-3">
                        <svg className="animate-spin h-5 w-5 text-info-fg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="font-semibold text-info-fg">
                          {t('quiz:results.blockchainRegisteringTitle')}
                        </p>
                      </div>
                      <p className="text-sm text-info-fg/80 mt-2">
                        {t('quiz:results.blockchainRegisteringDescription')}
                      </p>
                    </div>
                  )}

                  {chainStatus === 'failed_permanent' && (
                    <div className="mt-6 bg-error-bg border border-error-border rounded-lg p-6">
                      <p className="font-semibold text-error-fg mb-2">
                        {t('quiz:results.blockchainFailedTitle')}
                      </p>
                      <p className="text-sm text-error-fg/80 mb-4">
                        {t('quiz:results.blockchainFailedDescription')}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={retryMutation.isLoading || !submittedRecord}
                        onClick={() =>
                          submittedRecord &&
                          retryMutation.mutate({ recordId: submittedRecord.id })
                        }
                      >
                        {t('quiz:results.retryBlockchain')}
                      </Button>
                    </div>
                  )}

                  {confirmedTxHash && (
                    <div className="relative mt-6 bg-onchain-bg border border-onchain-border rounded-lg p-6 hash-grid overflow-hidden">
                      <motion.div
                        initial={reduceMotion ? false : { opacity: 0, scale: 2, rotate: -12 }}
                        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: -8 }}
                        transition={{ duration: reduceMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute -top-2 right-4 px-3 py-1 rounded-md border-2 border-primary/60 bg-card font-mono text-[11px] font-bold tracking-widest text-primary uppercase shadow-md"
                        aria-hidden="true"
                      >
                        ⛓ {t('quiz:results.onChainBadge')}
                      </motion.div>
                      <p className="font-semibold text-onchain-fg mb-2 mt-4">
                        {t('quiz:results.onChainTitle')}
                      </p>
                      <p className="text-sm text-onchain-fg/80 mb-3">
                        {t('quiz:results.onChainDescription')}
                      </p>
                      <a
                        href={getEtherscanUrl(confirmedTxHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-primary text-primary-foreground font-mono text-sm px-4 py-2 rounded-md hover:opacity-90 transition"
                      >
                        {t('quiz:results.viewOnEtherscan')}{' '}
                        <span className="font-mono inline-block rtl:rotate-180">→</span>
                      </a>
                    </div>
                  )}

                  {confirmedTxHash && (() => {
                    const shareText = t('cert:share.text', { topic: module.topic, score: quizResult.score });
                    const shareUrl = `${window.location.origin}/cert/${confirmedTxHash}?lang=${i18n.language}`;
                    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
                    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
                    const linkClasses = 'inline-flex items-center justify-center h-9 px-3 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors focus-ring-v2';
                    const copy = async () => {
                      await navigator.clipboard.writeText(shareUrl);
                      toast.success(t('cert:share.copied'));
                    };
                    return (
                      <div className="flex flex-wrap gap-3 mt-6 justify-center">
                        <a target="_blank" rel="noopener noreferrer" href={linkedInUrl} className={linkClasses}>
                          {t('cert:share.linkedin')}
                          <span className="font-mono inline-block rtl:rotate-180 ms-1">→</span>
                        </a>
                        <a target="_blank" rel="noopener noreferrer" href={twitterUrl} className={linkClasses}>
                          {t('cert:share.twitter')}
                        </a>
                        <Button variant="outline" size="sm" onClick={copy}>
                          {t('cert:share.copyLink')}
                        </Button>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Post-submit review — built from the answer key returned by
                  submitQuiz (the quiz itself never carries correct answers). */}
              <Card className="text-start">
                <CardHeader>
                  <CardTitle>{t('quiz:review.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    {buildQuizReview(quizData, selectedAnswers, quizResult.review).map(
                      (item, index) => (
                        <li
                          key={index}
                          className={`rounded-lg border p-4 ${
                            item.isCorrect
                              ? 'bg-success-bg border-success-border'
                              : 'bg-error-bg border-error-border'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="font-medium">
                              <span className="text-muted-foreground me-2">
                                {t('quiz:review.questionLabel', { number: index + 1 })}
                              </span>
                              {item.question}
                            </p>
                            <Badge variant={item.isCorrect ? 'success' : 'error'}>
                              {item.isCorrect
                                ? t('quiz:review.correct')
                                : t('quiz:review.incorrect')}
                            </Badge>
                          </div>
                          <p
                            className={`text-sm ${
                              item.isCorrect ? 'text-success-fg' : 'text-error-fg'
                            }`}
                          >
                            {t('quiz:review.yourAnswer', {
                              letter: answerLetter(item.selectedAnswer),
                              content: item.options[item.selectedAnswer] ?? '—',
                            })}
                          </p>
                          {!item.isCorrect && (
                            <p className="text-sm text-success-fg">
                              {t('quiz:review.correctAnswer', {
                                letter: answerLetter(item.correctAnswer),
                                content: item.options[item.correctAnswer] ?? '—',
                              })}
                            </p>
                          )}
                          {item.explanation && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {item.explanation}
                            </p>
                          )}
                        </li>
                      )
                    )}
                  </ol>
                </CardContent>
              </Card>

              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  {t('quiz:results.backToDashboard')}
                </Button>
                <Button onClick={handleStartQuiz}>{t('quiz:buttons.retake')}</Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating exit button — modo focado */}
      {focusMode && (
        <button
          type="button"
          onClick={() => setFocusMode(false)}
          className="fixed bottom-6 end-6 z-40 px-4 py-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition focus-ring-v2 font-medium text-sm"
          aria-label={t('module:focus.exit')}
        >
          {t('module:focus.exit')}
        </button>
      )}
    </div>
  );
};
