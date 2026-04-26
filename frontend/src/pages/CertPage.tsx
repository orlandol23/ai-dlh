import { useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/atoms/Button';
import { Card, CardContent } from '@/components/atoms/Card';
import { Skeleton } from '@/components/atoms/Skeleton';
import { ThemeToggle } from '@/components/atoms/ThemeToggle';
import { LanguageSelector } from '@/components/molecules/LanguageSelector';
import { trpc } from '@/lib/trpc';
import { getEtherscanUrl, formatAddress } from '@/lib/utils';
import { useFormatDate } from '@/lib/intl';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n';

/**
 * CertPage — public, shareable certificate page.
 *
 * URL: /cert/:hash?lang=<locale>
 * - hash: Ethereum transaction hash (0x... 66 chars)
 * - lang: optional locale override; if present and supported, switches i18n
 *   so the visitor sees the cert in the language the issuer shared it.
 *
 * No auth required — designed to be the OG image target for LinkedIn/X shares.
 */
export const CertPage = () => {
  const { hash } = useParams<{ hash: string }>();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation('cert');
  const reduce = useReducedMotion();
  const formatDate = useFormatDate();

  // Honor ?lang= query param (only switch if locale is supported)
  useEffect(() => {
    const lang = searchParams.get('lang') as SupportedLocale | null;
    if (lang && SUPPORTED_LOCALES.includes(lang) && lang !== i18n.language) {
      i18n.changeLanguage(lang);
    }
  }, [searchParams, i18n]);

  const { data, isLoading, error } = trpc.cert.getByHash.useQuery(
    { hash: hash ?? '' },
    { enabled: !!hash, retry: false },
  );

  return (
    <div className="min-h-screen hero-gradient relative overflow-hidden">
      <div className="absolute inset-0 hash-grid opacity-60 pointer-events-none" aria-hidden="true" />

      {/* Top bar — minimal, just logo + language/theme controls */}
      <header className="relative border-b border-border bg-background/60 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 focus-ring-v2 rounded-md">
            <img src="/logo.svg" alt="" aria-hidden="true" className="w-8 h-8" />
            <span className="font-display font-bold tracking-tight">AI-DLH</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="relative container mx-auto px-4 py-12 md:py-20">
        {isLoading && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Skeleton className="h-12 w-3/4 mx-auto" />
            <Skeleton className="h-32 w-1/2 mx-auto" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {error && (
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <p className="text-lg font-semibold">{t('page.notFound')}</p>
              <Button className="mt-4" asChild={false} onClick={() => (window.location.href = '/')}>
                {t('page.createYour')}
              </Button>
            </CardContent>
          </Card>
        )}

        {data && (
          <div className="max-w-3xl mx-auto text-center space-y-8">
            {/* On-chain badge stamp */}
            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 1.4, rotate: -12 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: -8 }}
              transition={{ duration: reduce ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block px-4 py-1.5 rounded-md border-2 border-primary/60 bg-card font-mono text-xs font-bold tracking-widest text-primary uppercase shadow-md"
              aria-hidden="true"
            >
              ⛓ {t('page.badge')}
            </motion.div>

            {/* Topic title */}
            <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tighter leading-[1.05]">
              {data.topic}
            </h1>

            {/* Score gigante */}
            <div className="flex flex-col items-center">
              <p className="eyebrow">{t('page.scoreLabel')}</p>
              <p className="font-display text-8xl md:text-9xl font-bold text-gradient-brand tabular-nums leading-none mt-2">
                {data.score}%
              </p>
            </div>

            {/* Meta */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>{t('page.completedAt', { date: formatDate(new Date(data.completedAt)) })}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{formatAddress(data.walletAddress)}</span>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-6">
              {data.transactionHash && (
                <a
                  href={getEtherscanUrl(data.transactionHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition focus-ring-v2"
                >
                  {t('page.verifyEtherscan')}
                  <span className="font-mono inline-block rtl:rotate-180 ms-2">→</span>
                </a>
              )}
              <Link
                to="/"
                className="inline-flex items-center justify-center h-11 px-6 rounded-md border border-input bg-background hover:bg-accent transition focus-ring-v2"
              >
                {t('page.createYour')}
                <span className="font-mono inline-block rtl:rotate-180 ms-2">→</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
