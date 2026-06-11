import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { trpc, createTRPCClient } from './lib/trpc';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { ModulePage } from './pages/ModulePage';
import { CertPage } from './pages/CertPage';
import { ErrorBoundary } from './components/molecules/ErrorBoundary';
import { Toaster } from './components/molecules/Toaster';
import { SkipLink } from './components/atoms/SkipLink';
import { useAuthStore } from './store/authStore';
import { RtlProvider } from './i18n/RtlProvider';

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
                  <Route path="/cert/:hash" element={<CertPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
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
