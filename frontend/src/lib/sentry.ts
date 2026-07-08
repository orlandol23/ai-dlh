import * as Sentry from '@sentry/react';
import type { ErrorEvent } from '@sentry/react';

/**
 * Sentry bootstrap for the frontend (C1 — Fase 0 do Plano-Mestre).
 *
 * Entirely optional: without VITE_SENTRY_DSN this module is a silent
 * no-op — `initSentry()` returns false and `captureException()` returns
 * immediately, so local dev and CI behave exactly as before.
 *
 * Privacy: the DSN is a public ingest key (safe in the bundle), but the
 * events themselves must never carry auth material. `sendDefaultPii` stays
 * off and `scrubSensitiveData` strips Authorization/cookie headers from
 * every outgoing event as a second line of defense.
 */

/** Request headers that must never be sent to Sentry (lowercase). */
const SENSITIVE_HEADERS = new Set<string>([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
]);

/** `beforeSend` hook: removes auth headers and cookies. Exported for tests. */
export function scrubSensitiveData(event: ErrorEvent): ErrorEvent {
  const headers = event.request?.headers;
  if (headers) {
    for (const key of Object.keys(headers)) {
      if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
        delete headers[key];
      }
    }
  }
  if (event.request && 'cookies' in event.request) {
    delete event.request.cookies;
  }
  return event;
}

let initialized = false;

/**
 * Initialize Sentry if (and only if) a DSN is configured.
 * Returns true when Sentry is active, false when running as a no-op.
 */
export function initSentry(
  dsn: string | undefined = import.meta.env.VITE_SENTRY_DSN
): boolean {
  if (!dsn) {
    return false;
  }
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Release is injected at build time by @sentry/vite-plugin (when
    // SENTRY_AUTH_TOKEN is present); the SDK picks it up automatically.
    integrations: [Sentry.browserTracingIntegration()],
    // Low on purpose: errors are the point of C1, and 0.1 keeps the
    // free-tier transaction quota safe.
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend: scrubSensitiveData,
  });
  initialized = true;
  return true;
}

/** Whether initSentry() actually activated the SDK. */
export function isSentryEnabled(): boolean {
  return initialized;
}

/**
 * Report an exception with optional structured context (e.g. the React
 * componentStack from the ErrorBoundary). No-op when Sentry is disabled.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (!initialized) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
