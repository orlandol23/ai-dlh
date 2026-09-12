import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { ThemeToggle } from '@/components/atoms/ThemeToggle';
import { LanguageSelector } from '@/components/molecules/LanguageSelector';
import { useAuth } from '@/hooks/useAuth';

/**
 * HomePage — landing composition C1 (docs/DESIGN-SYSTEM.md §4).
 *
 * Bench & Ledger structure: one factual statement, the Connect-wallet
 * action, a sample evidence ledger (illustrative states, not live data)
 * and the four pipeline steps as numbered editorial rules. No feature
 * tiles, no gradients, no emoji-as-icons.
 *
 * Preserved behaviour: authenticated visitors are redirected to
 * /dashboard; the wallet connection flow (useAuth) is untouched.
 */

/**
 * The contract the on-chain queue writes to — deployed with verified
 * source on Sepolia and cited in the README as the live receipt
 * artefact. A direct /cert/:hash link needs a live transaction hash
 * the repository does not pin, so the landing links the contract.
 */
const ETHERSCAN_CONTRACT_URL =
  'https://sepolia.etherscan.io/address/0x3C399AdD53c70DC828db096d6b953757494427CE';

export const HomePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['home', 'common', 'auth']);
  const { isAuthenticated, isConnecting, connectWallet } = useAuth();

  // Redirect to dashboard if already authenticated (pre-existing behaviour).
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Illustrative ledger rows — states the pipeline really produces
  // (recorded / registering / below threshold), never live data.
  const ledgerRows = [
    {
      title: t('home:ledger.item1'),
      meta: t('home:ledger.item1Meta'),
      score: '88%',
      state: t('home:ledger.stateRecorded'),
      chip: 'bg-success-bg text-success-fg border-success-border',
    },
    {
      title: t('home:ledger.item2'),
      meta: t('home:ledger.item2Meta'),
      score: '74%',
      state: t('home:ledger.stateRegistering'),
      chip: 'bg-primary/10 text-primary border-primary/30',
    },
    {
      title: t('home:ledger.item3'),
      meta: t('home:ledger.item3Meta'),
      score: '62%',
      state: t('home:ledger.stateBelow'),
      chip: 'bg-muted text-muted-foreground border-border',
    },
  ];

  const steps = [
    { title: t('home:pipeline.step1Title'), body: t('home:pipeline.step1Body') },
    { title: t('home:pipeline.step2Title'), body: t('home:pipeline.step2Body') },
    { title: t('home:pipeline.step3Title'), body: t('home:pipeline.step3Body') },
    { title: t('home:pipeline.step4Title'), body: t('home:pipeline.step4Body') },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header — wordmark + utilities + connect */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="" aria-hidden="true" className="h-8 w-8" />
            <span className="font-display text-base font-bold tracking-tight">AI-DLH</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
            <Button onClick={connectWallet} disabled={isConnecting} className="hidden sm:inline-flex">
              {isConnecting ? t('auth:connecting') : t('auth:connectWallet')}
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {/* C1 hero: statement (7/12) + sample evidence ledger (5/12) */}
        <section className="mx-auto grid w-full max-w-[1120px] gap-10 px-4 pb-14 pt-10 sm:px-6 md:pt-16 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <p className="eyebrow">{t('home:eyebrow')}</p>
            <h1 className="mt-3 max-w-[26ch] font-display text-4xl font-bold leading-[1.1] tracking-tight text-foreground md:text-5xl">
              {t('home:statement')}
            </h1>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full sm:w-auto"
              >
                {isConnecting ? t('auth:connecting') : t('auth:connectWallet')}
              </Button>
              <a
                href={ETHERSCAN_CONTRACT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-1 rounded-sm px-1 text-sm font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground focus-ring-v2"
              >
                {t('home:ctaSecondary')}
                <span className="font-mono" aria-hidden="true">↗</span>
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{t('home:metamaskNote')}</p>
          </div>

          <aside
            className="lg:col-span-5"
            aria-label={t('home:ledger.eyebrow')}
          >
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <p className="eyebrow">{t('home:ledger.eyebrow')}</p>
              </div>
              <ul>
                {ledgerRows.map((row, index) => (
                  <li
                    key={row.title}
                    className={
                      index > 0
                        ? 'flex items-center justify-between gap-3 border-t border-border px-4 py-3.5'
                        : 'flex items-center justify-between gap-3 px-4 py-3.5'
                    }
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{row.title}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{row.meta}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-sm tabular-nums text-foreground">{row.score}</span>
                      <span className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[11px] font-medium ${row.chip}`}>
                        {row.state}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                {t('home:ledger.caption')}
              </p>
            </div>
          </aside>
        </section>


        {/* Pipeline — four numbered editorial rules, no cards */}
        <section className="mx-auto w-full max-w-[1120px] px-4 pb-16 sm:px-6 md:pb-24">
          <h2 className="eyebrow">{t('home:pipeline.eyebrow')}</h2>
          <ol className="mt-6">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="grid grid-cols-[3rem_1fr] items-start gap-x-4 border-t border-border py-6"
              >
                <span className="pt-0.5 font-mono text-sm text-muted-foreground" aria-hidden="true">
                  0{index + 1}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6">
          <p className="text-sm text-muted-foreground">
            {t('common:footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  );
};
