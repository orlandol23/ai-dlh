import * as Sentry from '@sentry/node';
import type { ErrorEvent } from '@sentry/node';
import { config } from './env.js';
import { logger } from './logger.js';

/**
 * Sentry bootstrap for the server (C1, phase 0 of the master plan).
 *
 * Design constraints:
 *  - Entirely optional: without SENTRY_DSN this module is a silent no-op —
 *    `initSentry()` returns false, `captureException()` returns immediately.
 *    dev/test environments stay byte-for-byte identical to before.
 *  - Never log sensitive data: wallet addresses are fine (public by design),
 *    but PRIVATE_KEY / JWT / auth headers must never reach Sentry. The SDK's
 *    default scrubbing is kept ON (`sendDefaultPii: false`) and reinforced
 *    by `scrubSensitiveData` below, which strips auth headers and cookies
 *    from every outgoing event.
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

/**
 * `beforeSend` hook: removes auth headers and cookies from the event.
 * Exported for unit testing.
 */
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
 * Initialize Sentry if (and only if) SENTRY_DSN is configured.
 * Returns true when Sentry is active, false when running as a no-op.
 */
export function initSentry(): boolean {
  if (!config.SENTRY_DSN) {
    return false;
  }
  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    // Railway injects the git SHA of the deployed commit; undefined locally.
    release: process.env.RAILWAY_GIT_COMMIT_SHA || undefined,
    // Keep tracing cheap — errors are the point of C1, not performance.
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend: scrubSensitiveData,
  });
  initialized = true;
  logger.info('Sentry initialized (server)');
  return true;
}

/** Whether initSentry() actually activated the SDK. */
export function isSentryEnabled(): boolean {
  return initialized;
}

/**
 * Report an exception to Sentry with optional structured context
 * (e.g. `{ recordId, attempt }` from the blockchain queue).
 * Silent no-op when Sentry was not initialized.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (!initialized) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
