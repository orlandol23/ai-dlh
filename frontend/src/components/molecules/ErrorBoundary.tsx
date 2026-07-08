import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { Button } from '@/components/atoms/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/Card';
import { captureException } from '@/lib/sentry';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches uncaught render/lifecycle errors in the React tree below it and
 * shows a fallback UI instead of letting the whole app go blank. Mounted
 * once at the App root — without this, any thrown error during render
 * (e.g., a malformed tRPC response, a corrupted store value) collapses
 * the entire frontend to a white screen with no recovery path.
 *
 * Async errors inside event handlers / data-fetching are NOT caught here
 * (React's design); those are handled per-call by toast.error in the
 * mutation/query callbacks.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {

    console.error('Uncaught error in React tree:', error, info.componentStack);
    // Observability (C1): report render/lifecycle crashes to Sentry with
    // the component stack. No-op when VITE_SENTRY_DSN is not configured.
    captureException(error, { componentStack: info.componentStack });
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      // Only expose the raw error name/message in dev. In production an
      // Error.message can carry backend payload, config hints, or
      // user-specific data that the user shouldn't see (and that the
      // person looking at the screen probably can't act on anyway).
      // The full error is still console.error'd for whoever has DevTools
      // open or is shipping logs to a monitoring service.
      const showDetails = import.meta.env.DEV;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <p className="eyebrow">⚠️ Erro inesperado</p>
              <CardTitle className="font-display tracking-tight">Algo deu errado</CardTitle>
              <CardDescription>
                Encontramos um problema ao renderizar essa parte da aplicação.
                Você pode tentar voltar ou recarregar a página.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showDetails && (
                <details className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                  <summary className="cursor-pointer font-mono text-muted-foreground">
                    Detalhes técnicos (somente dev)
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-all text-muted-foreground">
                    {this.state.error.name}: {this.state.error.message}
                  </pre>
                </details>
              )}
              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="outline" className="flex-1">
                  Tentar novamente
                </Button>
                <Button onClick={this.handleReload} className="flex-1">
                  Recarregar página
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
