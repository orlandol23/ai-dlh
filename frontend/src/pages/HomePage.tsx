import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/atoms/Card';
import { ThemeToggle } from '@/components/atoms/ThemeToggle';
import { LanguageSelector } from '@/components/molecules/LanguageSelector';
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
  const { t } = useTranslation(['home', 'common', 'auth']);
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
              <img src="/logo.svg" alt="" aria-hidden="true" className="w-10 h-10" />
              <h1 className="text-xl font-bold">AI-DLH</h1>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <ThemeToggle />
              <Button
                onClick={connectWallet}
                disabled={isConnecting}
              >
                {isConnecting ? t('auth:connecting') : t('auth:connectWallet')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-16 relative">
        <div className="absolute inset-0 hash-grid opacity-70 pointer-events-none" aria-hidden="true" />
        <div className="max-w-4xl mx-auto text-center space-y-8 relative">
          <div className="space-y-4">
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-foreground tracking-tighter leading-[1.02] mt-8">
              <Trans
                i18nKey="home:hero.titleLine1"
                components={[<span className="text-gradient-brand" />]}
              />
              <br />
              <Trans
                i18nKey="home:hero.titleLine2"
                components={[<span className="text-gradient-brand" />]}
              />
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('home:hero.subtitle')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={connectWallet}
              disabled={isConnecting}
              className="w-full sm:w-auto"
            >
              {isConnecting ? t('auth:connecting') : t('home:hero.ctaPrimary')}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}
            >
              {t('home:hero.ctaSecondary')}
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-info-bg border border-info-border rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">🤖</span>
                </div>
                <CardTitle className="text-lg">{t('home:features.ai.title')}</CardTitle>
                <CardDescription>
                  {t('home:features.ai.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-onchain-bg border border-onchain-border rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">⛓️</span>
                </div>
                <CardTitle className="text-lg">{t('home:features.blockchain.title')}</CardTitle>
                <CardDescription>
                  {t('home:features.blockchain.description')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-success-bg border border-success-border rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <CardTitle className="text-lg">{t('home:features.progress.title')}</CardTitle>
                <CardDescription>
                  {t('home:features.progress.description')}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* How it works */}
          <div className="mt-20 space-y-8">
            <h2 className="font-display text-4xl font-bold tracking-tight">{t('home:howItWorks.title')}</h2>
            <div className="grid md:grid-cols-4 gap-6 text-left">
              <Card>
                <CardContent className="pt-6">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold mb-4">
                    1
                  </div>
                  <h3 className="font-semibold mb-2">{t('home:howItWorks.step1.title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('home:howItWorks.step1.description')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold mb-4">
                    2
                  </div>
                  <h3 className="font-semibold mb-2">{t('home:howItWorks.step2.title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('home:howItWorks.step2.description')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold mb-4">
                    3
                  </div>
                  <h3 className="font-semibold mb-2">{t('home:howItWorks.step3.title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('home:howItWorks.step3.description')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold mb-4">
                    4
                  </div>
                  <h3 className="font-semibold mb-2">{t('home:howItWorks.step4.title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('home:howItWorks.step4.description')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p>{t('common:footer.copyright', { year: new Date().getFullYear() })}</p>
            <p className="text-sm mt-2">
              {t('common:footer.poweredBy')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
