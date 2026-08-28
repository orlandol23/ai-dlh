import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/atoms/Card';
import { ThemeToggle } from '@/components/atoms/ThemeToggle';
import { LanguageSelector } from '@/components/molecules/LanguageSelector';
import { Avatar } from '@/components/atoms/Avatar';
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
import { PreferencesPanel } from '@/components/molecules/PreferencesPanel';
import { toast } from '@/components/molecules/Toaster';
import { useAuth } from '@/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatAddress } from '@/lib/utils';
import { buildSparklinePoints, calculateStreakDays, deriveAchievements } from '@/lib/achievements';

const STAGE_KEYS = ['0', '1', '2', '3', '4'] as const;

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['dashboard', 'common', 'auth', 'vark']);
  const { user, logout } = useAuth();
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
  const { data: modules } = trpc.ai.getUserModules.useQuery();
  const { data: stats } = trpc.progress.getStatistics.useQuery();
  const { data: progress } = trpc.progress.getUserProgress.useQuery();

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

  const walletAddress = user?.walletAddress || '';

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src="/logo.svg" alt={t('dashboard:header.logoAlt')} className="w-10 h-10" />
              <div>
                <h1 className="font-display text-xl font-bold tracking-tight">{t('dashboard:header.title')}</h1>
                <div className="flex items-center gap-2">
                  <Avatar seed={walletAddress} size={16} />
                  <p className="font-mono text-sm text-muted-foreground">
                    {formatAddress(walletAddress)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {streakDays > 0 && (
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-warning-bg border border-warning-border"
                  aria-label={t('dashboard:streak.badge', { count: streakDays })}
                  title={t('dashboard:streak.badge', { count: streakDays })}
                >
                  <span className="text-warning-fg font-mono text-xs font-semibold">
                    🔥 {streakDays}
                  </span>
                </div>
              )}
              <LanguageSelector />
              <ThemeToggle />
              <PreferencesPanel />
              <Button variant="outline" onClick={logout}>
                {t('auth:disconnect')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 space-y-6">
        {/* VARK onboarding CTA — only until the user takes the questionnaire.
            Fase 1 da fusão aprendaMais; the
            quiz can be retaken later from the preferences panel. */}
        {user && user.learningStyle == null && (
          <Card className="border-primary/40">
            <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="eyebrow">{t('vark:cta.eyebrow')}</p>
                <h2 className="font-display text-lg font-bold tracking-tight mt-1">
                  {t('vark:cta.title')}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('vark:cta.description')}
                </p>
              </div>
              <Button onClick={() => navigate('/vark')} className="shrink-0">
                {t('vark:cta.button')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Row 1 — 4 stat tiles, col-span-3 each on lg */}
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-4">
          <Card className="lg:col-span-3">
            <CardContent className="pt-6">
              <p className="eyebrow">{t('dashboard:stats.modules.eyebrow')}</p>
              <p className="font-display text-5xl font-bold text-primary tabular-nums leading-none mt-2">
                {stats?.modulesGenerated ?? 0}
              </p>
              <p className="text-sm text-muted-foreground mt-2">{t('dashboard:stats.modules.label')}</p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardContent className="pt-6">
              <p className="eyebrow">{t('dashboard:stats.quizzes.eyebrow')}</p>
              <p className="font-display text-5xl font-bold text-success-fg tabular-nums leading-none mt-2">
                {stats?.quizzesTaken ?? 0}
              </p>
              <p className="text-sm text-muted-foreground mt-2">{t('dashboard:stats.quizzes.label')}</p>
              {/* Passed is a subset of attempts — shown as subtext under the
                  quizzes-taken headline (kills the "passed N of 1 module"
                  paradox: the denominator is attempts, not modules). */}
              <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                {t('dashboard:stats.quizzes.sub', {
                  passed: stats?.passedModules ?? 0,
                  rate: stats?.completionRate ?? 0,
                })}
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardContent className="pt-6">
              <p className="eyebrow">{t('dashboard:stats.avgScore.eyebrow')}</p>
              <p className="font-display text-5xl font-bold text-info-fg tabular-nums leading-none mt-2">
                {stats?.avgScore ?? 0}%
              </p>
              <p className="text-sm text-muted-foreground mt-2">{t('dashboard:stats.avgScore.label')}</p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardContent className="pt-6">
              <p className="eyebrow">{t('dashboard:stats.onChain.eyebrow')}</p>
              <p className="font-display text-5xl font-bold text-onchain-fg tabular-nums leading-none mt-2">
                {stats?.onChainRecords ?? 0}
              </p>
              <p className="text-sm text-muted-foreground mt-2">{t('dashboard:stats.onChain.label')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Row 2 — sparkline (col-span-8) + achievements (col-span-4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card className="lg:col-span-8" data-onboarding="sparkline">
            <CardHeader>
              <p className="eyebrow">{t('dashboard:sparkline.eyebrow')}</p>
              <CardTitle className="font-display tracking-tight">{t('dashboard:sparkline.title')}</CardTitle>
              <CardDescription>
                {sparklinePoints.length === 0
                  ? t('dashboard:sparkline.descriptionEmpty')
                  : t('dashboard:sparkline.descriptionWithData', { count: sparklinePoints.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Sparkline points={sparklinePoints} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-4">
            <CardHeader>
              <p className="eyebrow">{t('dashboard:achievements.eyebrow')}</p>
              <CardTitle className="font-display tracking-tight text-lg">
                {achievements.filter((a) => a.unlocked).length} / {achievements.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AchievementsGrid achievements={achievements} />
            </CardContent>
          </Card>
        </div>

        {/* Row 3 — timeline on-chain (col-span-8) + form gerar (col-span-4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card className="lg:col-span-8" data-onboarding="onchain">
            <CardHeader>
              <p className="eyebrow">{t('dashboard:timeline.eyebrow')}</p>
              <CardTitle className="font-display tracking-tight">{t('dashboard:timeline.title')}</CardTitle>
              <CardDescription>
                {t('dashboard:timeline.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OnChainTimeline records={progress ?? []} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-4" data-onboarding="generator">
            <CardHeader>
              <p className="eyebrow">{t('dashboard:generator.eyebrow')}</p>
              <CardTitle className="font-display tracking-tight">{t('dashboard:generator.title')}</CardTitle>
              <CardDescription>{t('dashboard:generator.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateModule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('dashboard:generator.topicLabel')}</label>
                  <Input
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
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                    <p className="eyebrow mb-2">{t('dashboard:generator.workingEyebrow')}</p>
                    <p className="font-mono text-sm text-foreground caret">
                      {t(`dashboard:generator.stages.${STAGE_KEYS[streamStage]}`)}
                    </p>
                  </div>
                )}
              </form>

              {pendingModules.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="eyebrow mb-3">{t('dashboard:pending.eyebrow', { count: pendingModules.length })}</p>
                  <ul className="space-y-2">
                    {pendingModules.slice(0, 5).map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/module/${m.id}`)}
                          className="w-full text-left rounded-md border border-border bg-card hover:border-primary/40 hover:bg-muted transition-colors p-3"
                        >
                          <p className="text-sm font-semibold truncate">{m.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {m.topic} · {m.estimatedTime} {t('dashboard:pending.minutes')}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Skeleton estrutural — preview shell do módulo enquanto IA gera */}
        {isGenerating && (
          <Card className="hash-grid">
            <CardContent className="pt-6 space-y-4">
              <p className="eyebrow flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
                {t('dashboard:generating.eyebrow')}
              </p>
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="space-y-2 pt-4">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </div>
              <div className="space-y-2 pt-4">
                <Skeleton className="h-12 w-full rounded-md" />
                <Skeleton className="h-12 w-full rounded-md" />
                <Skeleton className="h-12 w-full rounded-md" />
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <OnboardingTour />
    </div>
  );
};
