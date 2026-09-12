import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import { Avatar } from '@/components/atoms/Avatar';
import { Button } from '@/components/atoms/Button';
import { ThemeToggle } from '@/components/atoms/ThemeToggle';
import { LanguageSelector } from '@/components/molecules/LanguageSelector';
import { PreferencesPanel } from '@/components/molecules/PreferencesPanel';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/molecules/Dialog';
import { useAuthStore } from '@/store/authStore';
import { cn, formatAddress } from '@/lib/utils';

/**
 * AppShell — persistent authenticated top bar (P1.1, docs/DESIGN-SYSTEM.md §4).
 *
 * Wraps /dashboard, /module/:id and /vark without changing routes: App.tsx
 * places it inside ProtectedRoute around each page element. Pages keep their
 * own <main id="main-content"> (the global SkipLink still targets it).
 *
 * Workbench rules applied here:
 * - flat bar: surface + hairline border, no resting shadow;
 * - no sidebar — the product has two destinations;
 * - wordmark + nav (aria-current via NavLink) + identity/tier + utilities;
 * - < md: wordmark + 44px menu button opening a Radix dialog bottom sheet
 *   that carries the same destinations, identity and controls;
 * - RTL-safe via logical properties (ms-/me-/ps-/pe-);
 * - module focus mode hides the bar: ModulePage mirrors its focus flag onto
 *   [data-focus-mode] and globals.css hides .app-shell-bar under html:has().
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation(['common', 'auth']);
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const wallet = user?.walletAddress ?? '';
  const tier = (user?.preferredTier as 'default' | 'premium' | undefined) ?? 'default';

  const navItems = [
    { to: '/dashboard', label: t('common:shell.navDashboard') },
    { to: '/vark', label: t('common:shell.navProfile') },
  ];

  return (
    <>
      <header className="app-shell-bar sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-2 px-4 sm:px-6">
          {/* Wordmark — home is public; returning there signs nothing out. */}
          <Link
            to="/"
            className="flex h-11 items-center gap-2 rounded-sm pe-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <img src="/logo.svg" alt="" aria-hidden="true" className="h-7 w-7" />
            <span className="font-display text-base font-bold tracking-tight">AI-DLH</span>
          </Link>

          {/* Primary navigation — desktop */}
          <nav
            aria-label={t('common:shell.primaryNav')}
            className="ms-4 hidden items-center gap-1 self-stretch md:flex"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'relative inline-flex items-center px-3 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    isActive
                      ? 'text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Utilities — desktop */}
          <div className="ms-auto hidden items-center gap-2 md:flex">
            {wallet && (
              <span
                className="flex h-9 items-center gap-1.5 rounded-sm border border-border bg-background px-2"
                title={t('common:shell.identityLabel')}
              >
                <Avatar seed={wallet} size={18} />
                <span className="font-mono text-xs text-muted-foreground">
                  {formatAddress(wallet)}
                </span>
              </span>
            )}
            <span
              className="hidden h-9 items-center rounded-sm border border-border bg-background px-2 font-mono text-xs text-muted-foreground lg:inline-flex"
              aria-label={tier === 'premium' ? t('common:shell.tierPremium') : t('common:shell.tierDefault')}
            >
              {tier === 'premium' ? t('common:shell.tierPremium') : t('common:shell.tierDefault')}
            </span>
            <LanguageSelector />
            <ThemeToggle />
            <PreferencesPanel />
            <Button variant="outline" size="sm" onClick={logout}>
              {t('auth:disconnect')}
            </Button>
          </div>

          {/* Utilities — mobile: one 44px menu button; everything else lives
              in the sheet so the bar stays one row tall on 390px screens. */}
          <div className="ms-auto flex items-center md:hidden">
            <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
              <button
                type="button"
                aria-label={t('common:shell.openMenu')}
                aria-expanded={menuOpen}
                aria-haspopup="dialog"
                onClick={() => setMenuOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <DialogContent className="inset-x-0 bottom-0 top-auto left-0 right-0 max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-b-none rounded-t-xl border-x-0 border-b-0 p-0">
                <div className="p-4 pb-6">
                  <DialogTitle className="sr-only">{t('common:shell.menu')}</DialogTitle>

                  <nav aria-label={t('common:shell.primaryNav')} className="space-y-1">
                    {navItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'flex h-11 items-center rounded-sm text-sm font-medium transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                            isActive
                              ? 'border-s-2 border-s-primary bg-accent/50 ps-2.5 text-foreground'
                              : 'border-s-2 border-s-transparent ps-2.5 text-muted-foreground hover:text-foreground',
                          )
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </nav>

                  <div className="mt-4 space-y-1 border-t border-border pt-4">
                    <p className="eyebrow">{t('common:shell.controls')}</p>

                    {wallet && (
                      <div
                        className="flex h-11 items-center gap-2 px-1"
                        title={t('common:shell.identityLabel')}
                      >
                        <Avatar seed={wallet} size={20} />
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatAddress(wallet)}
                        </span>
                        <span className="ms-auto font-mono text-xs text-muted-foreground">
                          {tier === 'premium'
                            ? t('common:shell.tierPremium')
                            : t('common:shell.tierDefault')}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 py-1">
                      <LanguageSelector className="h-11 flex-1 bg-card" />
                      <ThemeToggle className="h-11 w-11 shrink-0" />
                      <PreferencesPanel className="h-11 w-11 shrink-0" />
                    </div>

                    <Button
                      variant="outline"
                      className="h-11 w-full"
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                    >
                      {t('auth:disconnect')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

        </div>
      </header>
      {children}
    </>
  );
}
