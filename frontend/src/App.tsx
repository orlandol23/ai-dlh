import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { trpc, createTRPCClient } from './lib/trpc';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { ModulePage } from './pages/ModulePage';
import { ErrorBoundary } from './components/molecules/ErrorBoundary';
import { Toaster } from './components/molecules/Toaster';
import { useAuthStore } from './store/authStore';

function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        // Treat data as fresh for 30s. Without this, the Dashboard's three
        // parallel queries (modules / stats / progress) refire on every
        // mount/router-transition even when the user is just navigating
        // back from /module/:id. A short staleTime avoids the spinner
        // flash and the redundant load on Postgres without staleness
        // becoming user-visible (records only change after submitQuiz,
        // which already invalidates via tRPC's mutation lifecycle).
        staleTime: 30_000,
      },
    },
  }));

  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={200}>
            <BrowserRouter>
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
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
            <Toaster />
          </TooltipProvider>
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
