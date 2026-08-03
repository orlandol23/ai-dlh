import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { trpc, createTRPCClient } from './lib/trpc';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ErrorBoundary } from './components/molecules/ErrorBoundary';
import { Toaster } from './components/molecules/Toaster';
import { SkipLink } from './components/atoms/SkipLink';
import { Spinner } from './components/atoms/Spinner';
import { useAuthStore } from './store/authStore';
import { RtlProvider } from './i18n/RtlProvider';

/**
 * Route-level code-splitting: each page becomes its own chunk, loaded on
 * demand. Heavy vendors (ethers, framer-motion, react-markdown) are only
 * imported by pages/components inside these chunks, so they stay out of the
 * initial bundle too (see vite.config.ts manualChunks).
 *
 * Pages export named components, so map them onto the `default` shape
 * React.lazy expects.
 *
 * /cert/:hash keeps working standalone: the lazy chunk is fetched on first
 * render of the route, with no auth requirement — same behavior as before.
 */
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ModulePage = lazy(() => import('./pages/ModulePage').then((m) => ({ default: m.ModulePage })));
const CertPage = lazy(() => import('./pages/CertPage').then((m) => ({ default: m.CertPage })));
const VarkPage = lazy(() => import('./pages/VarkPage').then((m) => ({ default: m.VarkPage })));

/**
 * Suspense fallback while a route chunk downloads. Purely visual (design
 * system Spinner, no text) so it is i18n/RTL-neutral — it can render before
 * the i18n HTTP backend has loaded any namespace, and direction is already
 * handled at the <html dir> level by RtlProvider.
 */
const RouteFallback = () => (
  <div
    className="min-h-screen bg-background flex items-center justify-center"
    role="status"
    aria-busy="true"
  >
    <Spinner size="lg" className="text-primary" />
    {/* Non-localized sr-only label: this shell renders before the i18n
        namespaces have loaded, so a hardcoded word is the only option that
        announces anything to assistive tech. Visually hidden, RTL-neutral. */}
    <span className="sr-only">Loading…</span>
  </div>
);

function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        // Treat query data as fresh for 30s. Without this the Dashboard's
        // three parallel queries (modules / stats / progress) refire on
        // every mount or router-transition — even when the user is just
        // returning from /module/:id without doing anything that mutated
        // state. Spinner flash + redundant Postgres load with no benefit.
        //
        // Staleness is NOT invisible by default: mutations that change
        // the underlying records (submitQuiz, generateModule) must
        // explicitly invalidate the specific affected query keys in
        // their onSuccess handlers — for example
        // `utils.ai.getUserModules.invalidate()` rather than the
        // router-wide `utils.ai.invalidate()`, to avoid refetching
        // unrelated queries (getModuleById, etc.). Any new mutation
        // that touches progress_records / modules MUST do the same
        // targeted invalidate — otherwise it'll appear stale for up
        // to 30s.
        staleTime: 30_000,
      },
    },
  }));

  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <RtlProvider>
            <TooltipProvider delayDuration={200}>
              <BrowserRouter>
                <SkipLink />
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <DashboardPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/module/:id"
                      element={
                        <ProtectedRoute>
                          <ModulePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/vark"
                      element={
                        <ProtectedRoute>
                          <VarkPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/cert/:hash" element={<CertPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
              <Toaster />
            </TooltipProvider>
          </RtlProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}

// Protected route component
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default App;
