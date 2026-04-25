import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/atoms/Card';
import { useAuth } from '@/hooks/useAuth';

/**
 * HomePage - Landing page with authentication
 * 
 * Features:
 * - Hero section with project description
 * - MetaMask connection button
 * - Feature showcase (AI, Blockchain, Progress)
 * - "How it works" section
 * - Auto-redirect to dashboard if authenticated
 * 
 * @component
 */
export const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isConnecting, connectWallet } = useAuth();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen hero-gradient">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img src="/logo.svg" alt="AI-DLH" className="w-10 h-10" />
              <h1 className="text-xl font-bold">AI-DLH</h1>
            </div>
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? 'Conectando...' : 'Conectar Carteira'}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16 relative">
        <div className="absolute inset-0 hash-grid opacity-70 pointer-events-none" aria-hidden="true" />
        <div className="max-w-4xl mx-auto text-center space-y-8 relative">
          <div className="space-y-4">
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-foreground tracking-tighter leading-[1.02]">
              Aprenda com <span className="text-gradient-brand">IA</span>
              <br />
              Certifique em <span className="text-gradient-brand">cadeia</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Hub de aprendizado personalizado que usa IA Generativa para criar conteúdo educacional
              sob demanda e registra seu progresso na blockchain Ethereum.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={connectWallet}
              disabled={isConnecting}
              className="w-full sm:w-auto"
            >
              {isConnecting ? 'Conectando...' : 'Começar Agora'}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}
            >
              Saiba Mais
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">🤖</span>
                </div>
                <CardTitle className="text-lg">IA Generativa</CardTitle>
                <CardDescription>
                  Conteúdo educacional personalizado gerado pela Google Gemini AI
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">⛓️</span>
                </div>
                <CardTitle className="text-lg">Blockchain</CardTitle>
                <CardDescription>
                  Certificados permanentes registrados na blockchain Ethereum
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <CardTitle className="text-lg">Progresso</CardTitle>
                <CardDescription>
                  Acompanhe seu progresso e estatísticas de aprendizado
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* How it works */}
          <div className="mt-20 space-y-8">
            <h2 className="font-display text-4xl font-bold tracking-tight">Como Funciona</h2>
            <div className="grid md:grid-cols-4 gap-6 text-left">
              <Card>
                <CardContent className="pt-6">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold mb-4">
                    1
                  </div>
                  <h3 className="font-semibold mb-2">Conecte sua Carteira</h3>
                  <p className="text-sm text-gray-600">
                    Use MetaMask para autenticar via Web3
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold mb-4">
                    2
                  </div>
                  <h3 className="font-semibold mb-2">Escolha um Tópico</h3>
                  <p className="text-sm text-gray-600">
                    Digite o que deseja aprender e o nível de dificuldade
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold mb-4">
                    3
                  </div>
                  <h3 className="font-semibold mb-2">Estude e Pratique</h3>
                  <p className="text-sm text-gray-600">
                    Leia o conteúdo gerado e complete o quiz
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold mb-4">
                    4
                  </div>
                  <h3 className="font-semibold mb-2">Ganhe Certificado</h3>
                  <p className="text-sm text-gray-600">
                    Score ≥ 70% registra na blockchain
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            <p>© 2024 AI-DLH. Projeto de portfólio demonstrando Frontend, Full Stack, IA Generativa e Web3.</p>
            <p className="text-sm mt-2">
              Powered by React, TypeScript, Gemini AI, Ethereum & Solidity
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
