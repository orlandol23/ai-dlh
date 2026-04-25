import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { ThemeToggle } from '@/components/atoms/ThemeToggle';
import { toast } from '@/components/molecules/Toaster';
import { useAuth } from '@/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatAddress } from '@/lib/utils';

/**
 * DashboardPage - Main user dashboard
 * 
 * Features:
 * - Statistics display (total modules, passed, avg score, on-chain records)
 * - AI module generation form
 * - List of user's modules with navigation
 * - Loading states with spinner animation
 * 
 * @component
 */
export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [isGenerating, setIsGenerating] = useState(false);

  // Queries
  const { data: modules, refetch: refetchModules } = trpc.ai.getUserModules.useQuery();
  const { data: stats } = trpc.progress.getStatistics.useQuery();

  // Mutations
  const generateMutation = trpc.ai.generateModule.useMutation({
    onSuccess: () => {
      setIsGenerating(false);
      setTopic('');
      refetchModules();
      toast.success('🎉 Módulo gerado com sucesso!');
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error('Erro ao gerar módulo', { description: error.message });
    },
  });

  const handleGenerateModule = async (e: React.FormEvent) => {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src="/logo.svg" alt="AI-DLH" className="w-10 h-10" />
              <div>
                <h1 className="font-display text-xl font-bold tracking-tight">Dashboard</h1>
                <p className="font-mono text-sm text-muted-foreground">{formatAddress(user?.walletAddress || '')}</p>
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

      <main className="container mx-auto px-4 py-8">
        {/* Statistics */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="font-display text-5xl font-bold text-primary tabular-nums leading-none">{stats?.totalModules || 0}</p>
                <p className="text-sm text-muted-foreground mt-2">Total Módulos</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="font-display text-5xl font-bold text-success tabular-nums leading-none">{stats?.passedModules || 0}</p>
                <p className="text-sm text-muted-foreground mt-2">Aprovados</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="font-display text-5xl font-bold text-info tabular-nums leading-none">{stats?.avgScore || 0}%</p>
                <p className="text-sm text-muted-foreground mt-2">Score Médio</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="font-display text-5xl font-bold text-onchain tabular-nums leading-none">{stats?.onChainRecords || 0}</p>
                <p className="text-sm text-muted-foreground mt-2">Na Blockchain</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Generate Module Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Gerar Novo Módulo</CardTitle>
                <CardDescription>
                  Use IA para criar conteúdo personalizado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerateModule} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tópico de Estudo
                    </label>
                    <Input
                      type="text"
                      placeholder="Ex: TypeScript, React Hooks..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      required
                      minLength={3}
                      maxLength={200}
                      disabled={isGenerating}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nível de Dificuldade
                    </label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value as any)}
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
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Gerando módulo...</span>
                      </div>
                    ) : (
                      '🤖 Gerar com IA'
                    )}
                  </Button>

                  {isGenerating && (
                    <p className="text-sm text-muted-foreground text-center animate-pulse">
                      ⏳ A IA está criando…
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Modules List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Meus Módulos</CardTitle>
                <CardDescription>
                  {modules?.length || 0} módulos gerados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {modules && modules.length > 0 ? (
                  <div className="space-y-4">
                    {modules.map((module) => (
                      <div
                        key={module.id}
                        className="border border-border rounded-lg p-4 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">
                              {module.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {module.topic}
                            </p>
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
                                {module.level}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {module.estimatedTime} min
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.location.href = `/module/${module.id}`}
                          >
                            Estudar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-lg mb-2">Nenhum módulo ainda</p>
                    <p className="text-sm">
                      Gere seu primeiro módulo com IA ←
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};
