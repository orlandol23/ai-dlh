import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/atoms/Card';
import { ThemeToggle } from '@/components/atoms/ThemeToggle';
import { Avatar } from '@/components/atoms/Avatar';
import { Sparkline } from '@/components/molecules/Sparkline';
import { AchievementsGrid } from '@/components/molecules/AchievementsGrid';
import { OnChainTimeline } from '@/components/molecules/OnChainTimeline';
import { toast } from '@/components/molecules/Toaster';
import { useAuth } from '@/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatAddress } from '@/lib/utils';
import { buildSparklinePoints, deriveAchievements } from '@/lib/achievements';

const STREAM_STAGES = [
  'Analisando o tópico',
  'Estruturando o módulo',
  'Gerando conteúdo personalizado',
  'Montando o quiz',
  'Quase lá',
];

export const DashboardPage = () => {
  const navigate = useNavigate();
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
      setStreamStage((s) => (s + 1) % STREAM_STAGES.length);
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
  const achievements = useMemo(
    () =>
      deriveAchievements(
        stats ?? {
          totalModules: 0,
          passedModules: 0,
          onChainRecords: 0,
          highScoreCount: 0,
          hasPerfectScore: false,
          distinctTopicsCount: 0,
          currentStreak: 0,
        }
      ),
    [stats]
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
        toast.success('🎉 Módulo gerado!', { description: 'Abrindo o conteúdo…' });
        navigate(`/module/${data.id}`);
        return;
      }
      toast.error('Resposta inesperada ao gerar módulo', {
        description:
          'O módulo foi criado, mas não foi possível abri-lo automaticamente.',
      });
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error('Erro ao gerar módulo', { description: error.message });
    },
  });

  const handleGenerateModule = async (e: FormEvent) => {
    e.preventDefault();
    if (topic.length < 3) {
      toast.warning('Tópico muito curto', {
        description: 'O tópico deve ter pelo menos 3 caracteres.',
      });
      return;
    }
    setIsGenerating(true);
    generateMutation.mutate({ topic, level });
  };

  const walletAddress = user?.walletAddress || '';

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src="/logo.svg" alt="AI-DLH" className="w-10 h-10" />
              <div>
                <h1 className="font-display text-xl font-bold tracking-tight">Dashboard</h1>
                <div className="flex items-center gap-2">
                  <Avatar seed={walletAddress} size={16} />
                  <p className="font-mono text-sm text-muted-foreground">
                    {formatAddress(walletAddress)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" onClick={logout}>
                Desconectar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Row 1 — 4 stat tiles, col-span-3 each on lg */}
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-4">
          <Card className="lg:col-span-3">
            <CardContent className="pt-6">
              <p className="eyebrow">Total</p>
              <p className="font-display text-5xl font-bold text-primary tabular-nums leading-none mt-2">
                {stats?.totalModules ?? 0}
              </p>
              <p className="text-sm text-muted-foreground mt-2">Módulos gerados</p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardContent className="pt-6">
              <p className="eyebrow">Aprovados</p>
              <p className="font-display text-5xl font-bold text-success tabular-nums leading-none mt-2">
                {stats?.passedModules ?? 0}
              </p>
              <p className="text-sm text-muted-foreground mt-2">Score ≥ 70%</p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardContent className="pt-6">
              <p className="eyebrow">Score médio</p>
              <p className="font-display text-5xl font-bold text-info tabular-nums leading-none mt-2">
                {stats?.avgScore ?? 0}%
              </p>
              <p className="text-sm text-muted-foreground mt-2">Em todos os quizzes</p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardContent className="pt-6">
              <p className="eyebrow">⛓ On-chain</p>
              <p className="font-display text-5xl font-bold text-onchain tabular-nums leading-none mt-2">
                {stats?.onChainRecords ?? 0}
              </p>
              <p className="text-sm text-muted-foreground mt-2">Certificados ativos</p>
            </CardContent>
          </Card>
        </div>

        {/* Row 2 — sparkline (col-span-8) + achievements (col-span-4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card className="lg:col-span-8">
            <CardHeader>
              <p className="eyebrow">Histórico</p>
              <CardTitle className="font-display tracking-tight">Evolução de score</CardTitle>
              <CardDescription>
                {sparklinePoints.length === 0
                  ? 'Nenhum quiz concluído ainda — a linha tracejada marca o limiar de 70%'
                  : `Últimos ${sparklinePoints.length} quizzes — linha tracejada marca o limiar de 70%`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Sparkline points={sparklinePoints} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-4">
            <CardHeader>
              <p className="eyebrow">Conquistas</p>
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
          <Card className="lg:col-span-8">
            <CardHeader>
              <p className="eyebrow">Timeline</p>
              <CardTitle className="font-display tracking-tight">Atividade on-chain</CardTitle>
              <CardDescription>
                Quizzes completados e seus carimbos na blockchain Sepolia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OnChainTimeline records={progress ?? []} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-4">
            <CardHeader>
              <p className="eyebrow">🤖 IA</p>
              <CardTitle className="font-display tracking-tight">Gerar módulo</CardTitle>
              <CardDescription>Conteúdo personalizado sob demanda</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateModule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tópico de Estudo</label>
                  <Input
                    type="text"
                    placeholder="Ex: TypeScript, React Hooks…"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    required
                    minLength={3}
                    maxLength={200}
                    disabled={isGenerating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Nível</label>
                  <select
                    value={level}
                    onChange={(e) =>
                      setLevel(e.target.value as 'beginner' | 'intermediate' | 'advanced')
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    disabled={isGenerating}
                  >
                    <option value="beginner">Iniciante</option>
                    <option value="intermediate">Intermediário</option>
                    <option value="advanced">Avançado</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  className={`w-full relative ${isGenerating ? 'opacity-70 cursor-wait' : ''}`}
                  disabled={isGenerating || topic.length < 3}
                >
                  {isGenerating ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Gerando…</span>
                    </div>
                  ) : (
                    '🤖 Gerar com IA'
                  )}
                </Button>

                {isGenerating && (
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                    <p className="eyebrow mb-2">IA trabalhando</p>
                    <p className="font-mono text-sm text-foreground caret">
                      {STREAM_STAGES[streamStage]}
                    </p>
                  </div>
                )}
              </form>

              {pendingModules.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="eyebrow mb-3">Pendentes ({pendingModules.length})</p>
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
                            {m.topic} · {m.estimatedTime} min
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
      </main>
    </div>
  );
};
