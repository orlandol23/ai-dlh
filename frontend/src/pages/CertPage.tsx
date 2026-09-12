import { useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { Card, CardContent } from '@/components/atoms/Card';
import { Skeleton } from '@/components/atoms/Skeleton';
import { ThemeToggle } from '@/components/atoms/ThemeToggle';
import { LanguageSelector } from '@/components/molecules/LanguageSelector';
import { trpc } from '@/lib/trpc';
import { getEtherscanUrl, formatAddress } from '@/lib/utils';
import { useFormatDate } from '@/lib/intl';
import { toast } from '@/components/molecules/Toaster';
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
  const formatDate = useFormatDate();
  const isValidHash = /^0x[a-fA-F0-9]{64}$/.test(hash ?? '');

  // Honor ?lang= query param (only switch if locale is supported)
  useEffect(() => {
    const lang = searchParams.get('lang') as SupportedLocale | null;
    if (lang && SUPPORTED_LOCALES.includes(lang) && lang !== i18n.language) {
      i18n.changeLanguage(lang);
    }
  }, [searchParams, i18n]);

  const { data, isLoading, error } = trpc.cert.getByHash.useQuery(
    { hash: hash ?? '' },
    { enabled: isValidHash, retry: false },
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
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

      <main id="main-content" tabIndex={-1} className="container mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-16">
        {isLoading && (
          <div className="mx-auto max-w-3xl space-y-6" role="status" aria-label={t('page.loading')}>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {!isValidHash && (
          <Card className="mx-auto max-w-md">
            <CardContent className="pt-6" role="alert">
              <p className="eyebrow">{t('page.invalidLink')}</p>
              <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                {t('page.invalidLink')}
              </h1>
              <Button className="mt-4" onClick={() => (window.location.href = '/')}>
                {t('page.createYour')}
              </Button>
            </CardContent>
          </Card>
        )}

        {isValidHash && error && (
          <Card className="mx-auto max-w-md">
            <CardContent className="pt-6" role="alert">
              <p className="eyebrow">{t('page.verification')}</p>
              <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                {t('page.notFound')}
              </h1>
              <Button className="mt-4" onClick={() => (window.location.href = '/')}>
                {t('page.createYour')}
              </Button>
            </CardContent>
          </Card>
        )}

        {data && (
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">{t('page.verification')}</p>
            <div className="mt-3 border-y-2 border-foreground py-8 sm:py-10">
              <h1 className="max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-5xl">
                {data.title || data.topic}
              </h1>
              {data.title && <p className="mt-2 text-base text-muted-foreground">{data.topic}</p>}

              <div className="mt-10 grid gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <p className="eyebrow">{t('page.scoreLabel')}</p>
                  <p className="mt-2 font-display text-6xl font-bold leading-none tabular-nums text-success-fg sm:text-7xl">
                    {data.score}%
                  </p>
                  <p className="mt-3 font-mono text-sm text-success-fg">{t('page.thresholdPassed')}</p>
                </div>
                <div className="border-s-2 border-success p-4 sm:max-w-xs">
                  <p className="font-mono text-sm font-semibold text-success-fg">{t('page.verifiedSepolia')}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t('page.publicRecord')}</p>
                </div>
              </div>

              <dl className="mt-10 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
                <div>
                  <dt className="eyebrow">{t('page.walletLabel')}</dt>
                  <dd className="mt-1 font-mono text-sm">{formatAddress(data.walletAddress)}</dd>
                </div>
                <div>
                  <dt className="eyebrow">{t('page.completedLabel')}</dt>
                  <dd className="mt-1 text-sm">{formatDate(new Date(data.completedAt))}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="eyebrow">{t('page.transactionLabel')}</dt>
                  <dd className="mt-1 break-all font-mono text-xs">{data.transactionHash}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {data.transactionHash && (
                <a href={getEtherscanUrl(data.transactionHash)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  {t('page.verifyEtherscan')} <span aria-hidden="true" className="ms-2">↗</span>
                </a>
              )}
              <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-input bg-card px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                {t('page.createYour')}
              </Link>
            </div>

            {data.transactionHash && <CertShareRow topic={data.topic} score={data.score} txHash={data.transactionHash} />}
          </div>
        )}
      </main>
    </div>
  );
};

function CertShareRow({ topic, score, txHash }: { topic: string; score: number; txHash: string }) {
  const { t, i18n } = useTranslation(['cert', 'common']);
  const shareText = t('cert:share.text', { topic, score });
  const shareUrl = `${window.location.origin}/cert/${txHash}?lang=${i18n.language}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success(t('cert:share.copied'));
  };

  return (
    <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-4">
      <a target="_blank" rel="noopener noreferrer" href={linkedInUrl} className="inline-flex min-h-11 items-center rounded-lg border border-input bg-card px-3 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        {t('cert:share.linkedin')}
      </a>
      <a target="_blank" rel="noopener noreferrer" href={twitterUrl} className="inline-flex min-h-11 items-center rounded-lg border border-input bg-card px-3 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        {t('cert:share.twitter')}
      </a>
      <Button variant="outline" size="sm" className="h-11" onClick={copy}>
        {t('cert:share.copyLink')}
      </Button>
    </div>
  );
}
