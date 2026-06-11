import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/atoms/Card';
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
 * aprendaMais (Fase 1 da fusão, docs/FUSION_APRENDAMAIS.md).
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
      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 max-w-3xl">
        {step === 'intro' && (
          <Card>
            <CardHeader>
              <p className="eyebrow">{t('intro.eyebrow')}</p>
              <CardTitle className="font-display tracking-tight text-2xl">
                {t('intro.title')}
              </CardTitle>
              <CardDescription>{t('intro.description')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => setStep('quiz')}>{t('intro.start')}</Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                {t('intro.cancel')}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'quiz' && (
          <Card>
            <CardHeader>
              <p className="eyebrow">
                {t('quiz.progressLabel', {
                  current: questionIndex + 1,
                  total: VARK_QUESTION_COUNT,
                })}
              </p>
              <div
                className="h-2 w-full rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={VARK_QUESTION_COUNT}
                aria-valuenow={questionIndex + 1}
                aria-label={t('quiz.progressLabel', {
                  current: questionIndex + 1,
                  total: VARK_QUESTION_COUNT,
                })}
              >
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${((questionIndex + 1) / VARK_QUESTION_COUNT) * 100}%` }}
                />
              </div>
              <CardTitle className="font-display tracking-tight text-xl pt-2">
                {t(`questions.q${questionId}.text`)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <fieldset className="space-y-3">
                <legend className="sr-only">{t(`questions.q${questionId}.text`)}</legend>
                {LEARNING_STYLES.map((style) => (
                  <label
                    key={style}
                    className={`flex items-start gap-3 cursor-pointer rounded-md border p-3 transition-colors ${
                      selected === style
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted'
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

              <div className="flex justify-between pt-2">
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
            </CardContent>
          </Card>
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <p className="eyebrow">{t('result.eyebrow')}</p>
          <CardTitle className="font-display tracking-tight text-2xl">
            {t('result.title')}{' '}
            <span className="text-primary">
              {t(`styles.${profileKey}.emoji`)} {t(`styles.${profileKey}.name`)}
            </span>
          </CardTitle>
          <CardDescription>{t(`styles.${profileKey}.description`)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isMultimodal && (
            <p className="text-sm rounded-md border border-info-border bg-info-bg text-info-fg p-3">
              {t('result.multimodalNote', { style: t(`styles.${style}.name`) })}
            </p>
          )}
          <p className="text-sm text-muted-foreground">{t('result.aiNote')}</p>
          {isSaving && (
            <p className="text-sm text-muted-foreground" role="status">
              {t('result.saving')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display tracking-tight text-lg">
            {t('result.distributionTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {LEARNING_STYLES.map((s) => (
            <div key={s}>
              <div className="flex justify-between text-sm mb-1">
                <span>
                  {t(`styles.${s}.emoji`)} {t(`styles.${s}.name`)}
                </span>
                <span className="font-mono text-muted-foreground">
                  {t('result.pointsLabel', { count: counts[s], total: VARK_QUESTION_COUNT })}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${s === style ? 'bg-primary' : 'bg-primary/40'}`}
                  style={{ width: `${(counts[s] / VARK_QUESTION_COUNT) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display tracking-tight text-lg">
            {t('recommendations.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recommendations.map((rec) => (
            <div key={rec.title}>
              <h3 className="font-semibold text-sm">{rec.title}</h3>
              <p className="text-sm text-muted-foreground">{rec.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onBack}>{t('result.backToDashboard')}</Button>
        <Button variant="outline" onClick={onRetake}>
          {t('result.retake')}
        </Button>
      </div>
    </div>
  );
};
