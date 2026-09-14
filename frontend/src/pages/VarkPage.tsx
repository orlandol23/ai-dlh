import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { toast } from '@/components/molecules/Toaster';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/authStore';
import {
  LEARNING_STYLES,
  VARK_QUESTION_COUNT,
  VARK_QUESTION_IDS,
  countVarkAnswers,
  computeDominantStyle,
  type LearningStyle,
  type VarkCounts,
} from '@/lib/vark';

type Step = 'intro' | 'quiz' | 'result';

interface Recommendation {
  title: string;
  description: string;
}

/**
 * VARK learning-style questionnaire — onboarding flow ported from
 * aprendaMais (Fase 1 da fusão).
 *
 * 15 questions, one option per style each. The result screen renders the
 * locally-computed outcome immediately (same deterministic rule as the
 * server), while `learningStyle.submitVarkResult` persists the
 * server-computed style from the raw answers.
 */
export const VarkPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('vark');
  const { setUser } = useAuthStore();

  const [step, setStep] = useState<Step>('intro');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<number, LearningStyle>>>({});

  const submitMutation = trpc.learningStyle.submitVarkResult.useMutation({
    onSuccess: (data) => {
      setUser(data.user);
      toast.success(t('result.savedToast'), {
        description: t('result.savedToastDescription'),
      });
    },
    onError: (error) => {
      toast.error(t('result.saveErrorToast'), { description: error.message });
    },
  });

  const questionId = VARK_QUESTION_IDS[questionIndex];
  const selected = answers[questionId];
  const isLastQuestion = questionIndex === VARK_QUESTION_COUNT - 1;

  const orderedAnswers = useMemo(
    () =>
      VARK_QUESTION_IDS.map((id) => answers[id]).filter(
        (a): a is LearningStyle => a !== undefined,
      ),
    [answers],
  );

  const result = useMemo(() => {
    if (orderedAnswers.length !== VARK_QUESTION_COUNT) return null;
    const counts = countVarkAnswers(orderedAnswers);
    return { counts, ...computeDominantStyle(counts) };
  }, [orderedAnswers]);

  const handleFinish = () => {
    if (orderedAnswers.length !== VARK_QUESTION_COUNT) return;
    setStep('result');
    submitMutation.mutate({ answers: orderedAnswers });
  };

  const handleRetake = () => {
    setAnswers({});
    setQuestionIndex(0);
    submitMutation.reset();
    setStep('quiz');
  };

  return (
    <div className="min-h-screen bg-background">
      <main id="main-content" tabIndex={-1} className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
        {step === 'intro' && (
          <section className="max-w-3xl border-y-2 border-foreground py-8 sm:py-10" aria-labelledby="vark-title">
            <p className="eyebrow">{t('intro.eyebrow')}</p>
            <h1 id="vark-title" className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('intro.title')}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              {t('intro.description')}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => setStep('quiz')}>{t('intro.start')}</Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                {t('intro.cancel')}
              </Button>
            </div>
          </section>
        )}

        {step === 'quiz' && (
          <section className="max-w-3xl border-y-2 border-foreground py-6 sm:py-8" aria-labelledby="vark-question">
            <div className="flex items-baseline justify-between gap-4">
              <p className="eyebrow">
                {t('quiz.progressLabel', {
                  current: questionIndex + 1,
                  total: VARK_QUESTION_COUNT,
                })}
              </p>
              <span className="font-mono text-xs text-muted-foreground">
                {String(questionIndex + 1).padStart(2, '0')} / {String(VARK_QUESTION_COUNT).padStart(2, '0')}
              </span>
            </div>
              <div
                className="mt-4 h-1 w-full overflow-hidden bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={VARK_QUESTION_COUNT}
                aria-valuenow={questionIndex + 1}
                aria-label={t('quiz.progressLabel', {
                  current: questionIndex + 1,
                  total: VARK_QUESTION_COUNT,
                })}
              >
                <div className="h-full bg-primary transition-all" style={{ width: `${((questionIndex + 1) / VARK_QUESTION_COUNT) * 100}%` }} />
              </div>
              <h1 id="vark-question" className="mt-8 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {t(`questions.q${questionId}.text`)}
              </h1>
              <fieldset className="mt-8 space-y-3">
                <legend className="sr-only">{t(`questions.q${questionId}.text`)}</legend>
                {LEARNING_STYLES.map((style) => (
                  <label
                    key={style}
                    className={`flex min-h-11 cursor-pointer items-start gap-3 border p-3 transition-colors ${
                      selected === style
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-border-strong hover:bg-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`vark-q${questionId}`}
                      value={style}
                      checked={selected === style}
                      onChange={() =>
                        setAnswers((prev) => ({ ...prev, [questionId]: style }))
                      }
                      className="mt-1"
                    />
                    <span className="text-sm">
                      {t(`questions.q${questionId}.options.${style}`)}
                    </span>
                  </label>
                ))}
              </fieldset>

              {!selected && (
                <p className="text-xs text-muted-foreground">{t('quiz.selectAnswer')}</p>
              )}

              <div className="flex justify-between gap-3 border-t border-border pt-6">
                <Button
                  variant="outline"
                  disabled={questionIndex === 0}
                  onClick={() => setQuestionIndex((i) => Math.max(0, i - 1))}
                >
                  {t('quiz.previous')}
                </Button>
                {isLastQuestion ? (
                  <Button
                    disabled={orderedAnswers.length !== VARK_QUESTION_COUNT}
                    onClick={handleFinish}
                  >
                    {t('quiz.finish')}
                  </Button>
                ) : (
                  <Button
                    disabled={!selected}
                    onClick={() => setQuestionIndex((i) => i + 1)}
                  >
                    {t('quiz.next')}
                  </Button>
                )}
              </div>
          </section>
        )}

        {step === 'result' && result && (
          <ResultView
            counts={result.counts}
            style={result.style}
            isMultimodal={result.isMultimodal}
            isSaving={submitMutation.isLoading}
            onRetake={handleRetake}
            onBack={() => navigate('/dashboard')}
          />
        )}
      </main>
    </div>
  );
};

interface ResultViewProps {
  counts: VarkCounts;
  style: LearningStyle;
  isMultimodal: boolean;
  isSaving: boolean;
  onRetake: () => void;
  onBack: () => void;
}

const ResultView = ({ counts, style, isMultimodal, isSaving, onRetake, onBack }: ResultViewProps) => {
  const { t } = useTranslation('vark');

  // When the profile is multimodal we explain it as such (description +
  // recommendations), while making explicit which style was persisted.
  const profileKey = isMultimodal ? 'multimodal' : style;
  const recommendations = t(`recommendations.${profileKey}`, {
    returnObjects: true,
  }) as Recommendation[];

  return (
    <div className="max-w-3xl space-y-8">
      <section
        className="border-y-2 border-foreground py-8"
        aria-labelledby="vark-result-title"
        aria-busy={isSaving}
      >
          <p className="eyebrow">{t('result.eyebrow')}</p>
          <h1 id="vark-result-title" className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('result.title')}{' '}
            <span className="text-primary">{t(`styles.${profileKey}.name`)}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{t(`styles.${profileKey}.description`)}</p>
          {isMultimodal && (
            <p className="mt-5 border-s-2 border-info bg-info-bg p-3 text-sm text-info-fg">
              {t('result.multimodalNote', { style: t(`styles.${style}.name`) })}
            </p>
          )}
          <p className="mt-5 text-sm text-muted-foreground">{t('result.aiNote')}</p>
          {isSaving && (
            <p className="mt-3 text-sm text-muted-foreground" role="status">
              {t('result.saving')}
            </p>
          )}
      </section>

      <section aria-labelledby="vark-distribution-title">
          <h2 id="vark-distribution-title" className="font-display text-xl font-semibold tracking-tight">
            {t('result.distributionTitle')}
          </h2>
        <div className="mt-4 divide-y divide-border border-y border-border">
          {LEARNING_STYLES.map((s) => (
            <div key={s} className="py-4">
              <div className="flex justify-between text-sm mb-1">
                <span>
                  {t(`styles.${s}.name`)}
                </span>
                <span className="font-mono text-muted-foreground">
                  {t('result.pointsLabel', { count: counts[s], total: VARK_QUESTION_COUNT })}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden bg-muted">
                <div
                  className={`h-full ${s === style ? 'bg-primary' : 'bg-primary/40'}`}
                  style={{ width: `${(counts[s] / VARK_QUESTION_COUNT) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="vark-recommendations-title">
          <h2 id="vark-recommendations-title" className="font-display text-xl font-semibold tracking-tight">
            {t('recommendations.title')}
          </h2>
        <div className="mt-4 divide-y divide-border border-y border-border">
          {recommendations.map((rec) => (
            <div key={rec.title} className="py-4">
              <h3 className="font-semibold text-sm">{rec.title}</h3>
              <p className="text-sm text-muted-foreground">{rec.description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onBack}>{t('result.backToDashboard')}</Button>
        <Button variant="outline" onClick={onRetake}>
          {t('result.retake')}
        </Button>
      </div>
    </div>
  );
};
