import cors from 'cors';
import { config, allowedOrigins, allowedOriginSuffixes, isDevelopment } from '../utils/env.js';

/**
 * CORS configuration.
 *
 * Previously we allowed any `*.vercel.app` host, which meant any Vercel
 * deployment (including unrelated ones) could call this API. That wildcard
 * is removed: origins must now match an explicit allowlist.
 *
 *  - `FRONTEND_URL`             → always allowed (normalized to URL origin).
 *  - `ALLOWED_ORIGINS`          → comma-separated exact origins.
 *  - `ALLOWED_ORIGIN_SUFFIXES`  → comma-separated host suffixes (e.g.
 *                                 "-myorg.vercel.app") for preview deploys.
 *  - In development, localhost is allowed.
 *
 * Disallowed origins are signalled with `callback(null, false)` (not an
 * Error), so the request continues without CORS headers and the browser
 * blocks it client-side. Throwing here would surface as HTTP 500 in the
 * global Express error handler, polluting metrics/logs with fake 5xx.
 */
function toOrigin(value: string): string {
  // Tolerate values that include a trailing slash or path. Browsers send
  // origins as scheme+host+port only.
  return new URL(value).origin;
}

const alwaysAllowed = new Set<string>([
  toOrigin(config.FRONTEND_URL),
  ...allowedOrigins.map(toOrigin),
]);

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // No origin (same-origin, curl, server-to-server). cors() will not set
    // a permissive Access-Control-Allow-Origin header in that case.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (alwaysAllowed.has(origin)) {
      callback(null, true);
      return;
    }

    let host: string;
    try {
      host = new URL(origin).host.toLowerCase();
    } catch {
      callback(null, false);
      return;
    }

    // Preview deploys: host must end with one of the configured suffixes.
    for (const suffix of allowedOriginSuffixes) {
      if (suffix && host.endsWith(suffix.toLowerCase())) {
        callback(null, true);
        return;
      }
    }

    if (isDevelopment() && origin.startsWith('http://localhost:')) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
