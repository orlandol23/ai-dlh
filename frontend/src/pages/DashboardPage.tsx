import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { useAuth } from '@/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { formatAddress, getEtherscanUrl } from '@/lib/utils';

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
      alert('Módulo gerado com sucesso!');
    },
    onError: (error) => {
      setIsGenerating(false);
      alert('Erro ao gerar módulo: ' + error.message);
    },
  });

  const handleGenerateModule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (topic.length < 3) {
      alert('O tópico deve ter pelo menos 3 caracteres');
      return;
    }

    setIsGenerating(true);
    generateMutation.mutate({ topic, level });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
                AI
              </div>
              <div>
                <h1 className="text-xl font-bold">Dashboard</h1>
                <p className="text-sm text-gray-600">{formatAddress(user?.walletAddress || '')}</p>
              </div>
            </div>
            <Button variant="outline" onClick={logout}>
              Desconectar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Statistics */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{stats?.totalModules || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Total Módulos</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{stats?.passedModules || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Aprovados</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{stats?.avgScore || 0}%</p>
                <p className="text-sm text-gray-600 mt-1">Score Médio</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">{stats?.onChainRecords || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Na Blockchain</p>
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
                      disabled={generateMutation.isPending}
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

                  {generateMutation.isPending && (
                    <p className="text-sm text-gray-600 text-center animate-pulse">
                      ⏳ A IA está criando seu módulo personalizado...
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
                        className="border rounded-lg p-4 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">
                              {module.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
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
                              <span className="text-sm text-gray-500">
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
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg mb-2">Nenhum módulo ainda</p>
                    <p className="text-sm">
                      Gere seu primeiro módulo com IA! ←
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
