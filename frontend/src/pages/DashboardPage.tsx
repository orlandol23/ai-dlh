import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/atoms/Card';
import { Skeleton } from '@/components/atoms/Skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/Select';
import { Sparkline } from '@/components/molecules/Sparkline';
import { AchievementsGrid } from '@/components/molecules/AchievementsGrid';
import { OnChainTimeline } from '@/components/molecules/OnChainTimeline';
import { OnboardingTour } from '@/components/molecules/OnboardingTour';
import { StatBand } from '@/components/dashboard/StatBand';
import { toast } from '@/components/molecules/Toaster';
import { useAuth } from '@/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { buildSparklinePoints, calculateStreakDays, deriveAchievements } from '@/lib/achievements';

const STAGE_KEYS = ['0', '1', '2', '3', '4'] as const;

/**
 * QueryErrorRow — inline error treatment for a dashboard data region
 * (v3 §8): what failed (specific title), the raw message for context,
 * what the user can safely do (retry — the existing query retry behavior
 * is untouched; this only surfaces a manual refetch).
 */
function QueryErrorRow({
  title,
  message,
  hint,
  onRetry,
  retryLabel,
}: {
  title: string;
  message: string;
  hint: string;
  onRetry: () => void;
  retryLabel: string;
}) {
  return (
    <div role="alert" className="rounded-sm border border-error-border bg-error-bg p-3">
      <p className="text-sm font-medium text-error-fg">{title}</p>
      <p className="mt-1 break-all font-mono text-xs text-error-fg/80">{message}</p>
      <p className="mt-1 text-xs text-error-fg/80">{hint}</p>
      <Button variant="outline" size="sm" className="mt-2 h-11" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['dashboard', 'common', 'auth', 'vark']);
  const { user } = useAuth();
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamStage, setStreamStage] = useState(0);

  useEffect(() => {
    if (!isGenerating) {
      setStreamStage(0);
      return;
    }
    const id = window.setInterval(() => {
      // Cycle through stages while generating; no fixed total duration.
      setStreamStage((s) => (s + 1) % STAGE_KEYS.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [isGenerating]);

  const utils = trpc.useUtils();
  // Same queries, same keys, same payloads as before — P1.2 only captures
  // isLoading/error/refetch so each region can render an intentional state.
  const modulesQuery = trpc.ai.getUserModules.useQuery();
  const statsQuery = trpc.progress.getStatistics.useQuery();
  const progressQuery = trpc.progress.getUserProgress.useQuery();
  const modules = modulesQuery.data;
  const stats = statsQuery.data;
  const progress = progressQuery.data;
  const modulesError = modulesQuery.error;
  const statsError = statsQuery.error;
  const progressError = progressQuery.error;
  const tier = (user?.preferredTier as 'default' | 'premium' | undefined) ?? 'default';

  const sparklinePoints = useMemo(
    () => buildSparklinePoints(progress ?? [], 12),
    [progress]
  );
  const streakDays = useMemo(() => calculateStreakDays(progress ?? []), [progress]);
  const achievements = useMemo(
    () =>
      deriveAchievements(
        stats ?? {
          modulesGenerated: 0,
          passedModules: 0,
          onChainRecords: 0,
          highScoreCount: 0,
          hasPerfectScore: false,
          distinctTopicsCount: 0,
          currentStreakCapped: 0,
        },
        streakDays
      ),
    [stats, streakDays]
  );
  const pendingModules = useMemo(() => {
    // Wait for both queries to resolve. Otherwise progress=undefined makes
    // every module flicker as "pending" until getUserProgress returns.
    if (!modules || progress === undefined) return [];
    const completedIds = new Set(progress.map((p) => p.moduleId));
    return modules.filter((m) => !completedIds.has(m.id));
  }, [modules, progress]);

  const generateMutation = trpc.ai.generateModule.useMutation({
    onSuccess: (data) => {
      setIsGenerating(false);
      setTopic('');
      // Generating a module changes the catalog and (via the new module
      // appearing on this dashboard) the pending-modules sidebar. Only
      // getUserModules is affected — invalidate just that key instead of
      // the entire `ai` router so unrelated queries (getModuleById for
      // open modules, etc.) don't unnecessarily refetch.
      void utils.ai.getUserModules.invalidate();
      if (typeof data?.id === 'number') {
        toast.success(t('dashboard:toasts.moduleGenerated'), {
          description: t('dashboard:toasts.moduleGeneratedDesc'),
        });
        navigate(`/module/${data.id}`);
        return;
      }
      toast.error(t('dashboard:toasts.unexpectedResponse'), {
        description: t('dashboard:toasts.unexpectedResponseDesc'),
      });
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error(t('dashboard:toasts.generationError'), { description: error.message });
    },
  });

  const handleGenerateModule = async (e: FormEvent) => {
    e.preventDefault();
    if (topic.length < 3) {
      toast.warning(t('dashboard:toasts.topicTooShort'), {
        description: t('dashboard:toasts.topicTooShortDesc'),
      });
      return;
    }
    setIsGenerating(true);
    // Send the user's active i18n locale so the AI generates content in the
    // language they are reading the UI in. Read resolvedLanguage rather than
    // language: the latter is what was *requested* (it can be a region tag
    // like "en-US", or anything the browser reported), while the former is
    // what i18next actually settled on. Validate it against the supported
    // list anyway, so a value outside the enum can never reach the server,
    // and fall back to the same default as `fallbackLng`.
    const active = i18n.resolvedLanguage ?? i18n.language;
    const locale: SupportedLocale = SUPPORTED_LOCALES.includes(
      active as SupportedLocale
    )
      ? (active as SupportedLocale)
      : 'en';
    generateMutation.mutate({ topic, level, locale });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* P1.2 — C2 composition (docs/DESIGN-SYSTEM.md §4). The AppShell owns
          the top bar; this page is the learner's evidence ledger. Primary
          column (8/12): ruled stat band, evidence ledger, score history.
          Rail (4/12): generator, not-attempted modules, VARK, achievements. */}
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-6 sm:px-6">
        <p className="eyebrow">{t('dashboard:page.eyebrow')}</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">
          {t('dashboard:header.title')}
        </h1>
        {/* Restrained 2px title rule (v3 §6) */}
        <div className="mt-3 h-0.5 w-full bg-foreground/90" aria-hidden="true" />
      </div>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-8 sm:px-6"
      >
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Primary column (8/12) — the evidence ledger */}
          <div className="min-w-0 space-y-10 lg:col-span-8">
            {/* Ruled stat band — pipeline order: modules → attempts → average
                → recorded (v3 §8). Values are strong ink with tabular numerals;
                the streak stays secondary, neutral metadata below the band. */}
            <section>
              {statsQuery.isLoading ? (
                <div role="status" aria-label={t('dashboard:errors.statsLoading')}>
                  <Skeleton className="h-[100px] rounded-lg" />
                </div>
              ) : statsError ? (
                <QueryErrorRow
                  title={t('dashboard:errors.statsTitle')}
                  message={statsError.message}
                  hint={t('dashboard:errors.hint')}
                  onRetry={() => void statsQuery.refetch()}
                  retryLabel={t('dashboard:errors.retry')}
                />
              ) : (
                <>
                  <StatBand
                    metrics={[
                      {
                        label: t('dashboard:stats.modules.eyebrow'),
                        value: String(stats?.modulesGenerated ?? 0),
                        sub: t('dashboard:stats.modules.label'),
                      },
                      {
                        label: t('dashboard:stats.quizzes.eyebrow'),
                        value: String(stats?.quizzesTaken ?? 0),
                        sub: t('dashboard:stats.quizzes.sub', {
                          passed: stats?.passedModules ?? 0,
                          rate: stats?.completionRate ?? 0,
                        }),
                      },
                      {
                        label: t('dashboard:stats.avgScore.eyebrow'),
                        value: `${stats?.avgScore ?? 0}%`,
                        sub: t('dashboard:stats.avgScore.label'),
                      },
                      {
                        label: t('dashboard:stats.onChain.eyebrow'),
                        value: String(stats?.onChainRecords ?? 0),
                        sub: t('dashboard:stats.onChain.label'),
                      },
                    ]}
                  />
                  {streakDays > 0 && (
                    <p className="mt-2 font-mono text-xs text-muted-foreground">
                      {t('dashboard:streak.badge', { count: streakDays })}
                    </p>
                  )}
                </>
              )}
            </section>

        {/* Evidence ledger — one row per graded attempt, newest first */}
            <section data-onboarding="onchain" aria-labelledby="ledger-heading">
              <p className="eyebrow">{t('dashboard:ledger.eyebrow')}</p>
              <h2
                id="ledger-heading"
                className="mt-2 text-xl font-semibold tracking-tight text-foreground"
              >
                {t('dashboard:ledger.title')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('dashboard:ledger.description')}
              </p>
              <div className="mt-4">
                {progressQuery.isLoading ? (
                  <div
                    className="space-y-2"
                    role="status"
                    aria-label={t('dashboard:errors.ledgerLoading')}
                  >
                    <Skeleton className="h-[76px]" />
                    <Skeleton className="h-[76px]" />
                    <Skeleton className="h-[76px]" />
                  </div>
                ) : progressError ? (
                  <QueryErrorRow
                    title={t('dashboard:errors.ledgerTitle')}
                    message={progressError.message}
                    hint={t('dashboard:errors.hint')}
                    onRetry={() => void progressQuery.refetch()}
                    retryLabel={t('dashboard:errors.retry')}
                  />
                ) : (
                  <OnChainTimeline records={progress ?? []} />
                )}
              </div>
            </section>

        {/* Score history — solid teal line, dashed 70% threshold rule */}
            <section data-onboarding="sparkline" aria-labelledby="history-heading">
              <p className="eyebrow">{t('dashboard:sparkline.eyebrow')}</p>
              <h2
                id="history-heading"
                className="mt-2 text-xl font-semibold tracking-tight text-foreground"
              >
                {t('dashboard:sparkline.title')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {sparklinePoints.length === 0
                  ? t('dashboard:sparkline.descriptionEmpty')
                  : t('dashboard:sparkline.descriptionWithData', { count: sparklinePoints.length })}
              </p>
              <div className="mt-4">
                {progressQuery.isLoading ? (
                  <Skeleton className="h-24 w-full" aria-hidden="true" />
                ) : progressError ? (
                  <QueryErrorRow
                    title={t('dashboard:errors.scoresTitle')}
                    message={progressError.message}
                    hint={t('dashboard:errors.hint')}
                    onRetry={() => void progressQuery.refetch()}
                    retryLabel={t('dashboard:errors.retry')}
                  />
                ) : (
                  <Sparkline points={sparklinePoints} />
                )}
              </div>
            </section>
          </div>

          {/* Rail (4/12) — generation and next actions */}
          <aside className="min-w-0 space-y-8 lg:col-span-4">

        {/* Generator — the persistent next action. Panel because it is an
                interactive working region (v3 §4); the rail holds no other
                panels. */}
            <Card data-onboarding="generator">
            <CardHeader>
              <p className="eyebrow">{t('dashboard:generator.eyebrow')}</p>
              <CardTitle className="font-display tracking-tight">{t('dashboard:generator.title')}</CardTitle>
              <CardDescription>{t('dashboard:generator.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateModule} className="space-y-4">
                <div>
                  <label htmlFor="topic-input" className="block text-sm font-medium mb-2">
                    {t('dashboard:generator.topicLabel')}
                  </label>
                  <Input
                    id="topic-input"
                    type="text"
                    placeholder={t('dashboard:generator.topicPlaceholder')}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    required
                    minLength={3}
                    maxLength={200}
                    disabled={isGenerating}
                  />
                </div>

                <div>
                  <label htmlFor="level-select" className="block text-sm font-medium mb-2">
                    {t('dashboard:generator.levelLabel')}
                  </label>
                  <Select
                    value={level}
                    onValueChange={(v) => setLevel(v as 'beginner' | 'intermediate' | 'advanced')}
                    disabled={isGenerating}
                  >
                    <SelectTrigger id="level-select" aria-label={t('dashboard:generator.levelLabel')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">{t('dashboard:generator.levels.beginner')}</SelectItem>
                      <SelectItem value="intermediate">{t('dashboard:generator.levels.intermediate')}</SelectItem>
                      <SelectItem value="advanced">{t('dashboard:generator.levels.advanced')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  className={`w-full relative overflow-hidden ${isGenerating ? 'cursor-wait' : ''}`}
                  disabled={isGenerating || topic.length < 3}
                >
                  <span className="relative z-10">
                    {isGenerating ? t('dashboard:generator.generating') : t('dashboard:generator.submit')}
                  </span>
                  {isGenerating && <span className="bar-indeterminate" aria-hidden="true" />}
                </Button>

                {isGenerating && (
                  <div className="rounded-sm border border-border bg-muted/50 p-3" role="status">
                    <p className="eyebrow mb-2">{t('dashboard:generator.workingEyebrow')}</p>
                    <p className="font-mono text-sm text-foreground caret">
                      {t(`dashboard:generator.stages.${STAGE_KEYS[streamStage]}`)}
                    </p>
                    {/* The tier actually configured for the next generation —
                        the control itself lives in the AppShell/preferences. */}
                    <p className="mt-2 font-mono text-xs text-muted-foreground">
                      {tier === 'premium'
                        ? t('common:shell.tierPremium')
                        : t('common:shell.tierDefault')}
                    </p>
                  </div>
                )}
              </form>

              </CardContent>
            </Card>

            {/* Not-attempted study units — rows with neutral metadata
                (topic · level · time); the teal left rule marks "generated,
                not yet attempted". No success/warning/danger colours here. */}
            <section aria-label={t('dashboard:pending.eyebrow', { count: pendingModules.length })}>
              <p className="eyebrow">
                {t('dashboard:pending.eyebrow', { count: pendingModules.length })}
              </p>
              <div className="mt-3">
                {modulesQuery.isLoading ? (
                  <div className="space-y-2" role="status" aria-label={t('dashboard:errors.modulesLoading')}>
                    <Skeleton className="h-14" />
                    <Skeleton className="h-14" />
                  </div>
                ) : modulesError ? (
                  <QueryErrorRow
                    title={t('dashboard:errors.modulesTitle')}
                    message={modulesError.message}
                    hint={t('dashboard:errors.hint')}
                    onRetry={() => void modulesQuery.refetch()}
                    retryLabel={t('dashboard:errors.retry')}
                  />
                ) : (
                  <ul className="space-y-2">
                    {pendingModules.slice(0, 5).map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/module/${m.id}`)}
                          className="w-full rounded-sm border border-border border-s-2 border-s-primary/40 bg-card p-3 text-left transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <p className="truncate text-sm font-semibold text-foreground">{m.title}</p>
                          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                            {m.topic} · {t(`dashboard:generator.levels.${m.level}`)} · {m.estimatedTime}{' '}
                            {t('dashboard:pending.minutes')}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* VARK — compact profile chip; first-run CTA until the
                questionnaire is taken (retake lives in preferences). The
                eyebrow is dashboard-local (the shared vark:cta.eyebrow
                carries an emoji — copy debt reported, not changed). */}
            {user && user.learningStyle == null && (
              <div className="rounded-sm border border-border bg-card p-4">
                <p className="eyebrow">{t('dashboard:vark.eyebrow')}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{t('vark:cta.title')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('vark:cta.description')}</p>
                <Button size="sm" className="mt-3 h-11 w-full" onClick={() => navigate('/vark')}>
                  {t('vark:cta.button')}
                </Button>
              </div>
            )}
            {user?.learningStyle != null && (
              <div className="flex items-center justify-between gap-2 rounded-sm border border-border bg-card px-3 py-2">
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {t('vark:preferences.current', {
                    style: t(`vark:styles.${user.learningStyle}.name`),
                  })}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/vark')}
                  className="shrink-0 rounded-sm font-mono text-xs text-primary underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {t('vark:preferences.retake')}
                </button>
              </div>
            )}

            {/* Achievements — restrained strip; derived via deriveAchievements
                (unchanged). Locked rows are dashed, unlocked rows carry a teal
                left rule — a shape difference, never colour-only. */}
            <section aria-label={t('dashboard:achievements.eyebrow')}>
              <div className="flex items-center justify-between gap-2">
                <p className="eyebrow">{t('dashboard:achievements.eyebrow')}</p>
                <p className="font-mono text-xs tabular-nums text-muted-foreground" aria-hidden="true">
                  {achievements.filter((a) => a.unlocked).length} / {achievements.length}
                </p>
              </div>
              <AchievementsGrid achievements={achievements} className="mt-3" />
            </section>

            {/* Generating preview — layout-preserving skeleton while the
                pipeline builds the module */}
            {isGenerating && (
              <div className="rounded-sm border border-border bg-card p-4" role="status" aria-busy="true">
                <p className="eyebrow flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse"
                    aria-hidden="true"
                  />
                  {t('dashboard:generating.eyebrow')}
                </p>
                <Skeleton className="mt-3 h-8 w-3/4" />
                <Skeleton className="mt-3 h-3 w-1/2" />
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
      <OnboardingTour />
    </div>
  );
};
