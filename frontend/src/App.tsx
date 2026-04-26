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
      },
    },
  }));

  const [trpcClient] = useState(() => createTRPCClient());

  return (
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
