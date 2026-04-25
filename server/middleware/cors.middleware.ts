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
function toOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

// `allowedOrigins` is already normalized by the Zod env schema, and
// `FRONTEND_URL` is a valid URL per the schema, so this never throws.
const alwaysAllowed = new Set<string>([
  new URL(config.FRONTEND_URL).origin,
  ...allowedOrigins,
]);

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // No origin (same-origin, curl, server-to-server). cors() will not set
    // a permissive Access-Control-Allow-Origin header in that case.
    if (!origin) {
      callback(null, true);
      return;
    }

    // Normalize the incoming Origin so casing / trailing-slash differences
    // from non-browser clients don't cause false rejections.
    const normalized = toOrigin(origin);
    if (!normalized) {
      callback(null, false);
      return;
    }

    if (alwaysAllowed.has(normalized)) {
      callback(null, true);
      return;
    }

    const host = new URL(normalized).host.toLowerCase();

    // Preview deploys: host must end with one of the configured suffixes.
    // Each suffix is required by the env schema to start with "-" or "."
    // so that endsWith() matches on a label boundary — otherwise a
    // suffix like "example.com" would also accept "evil-example.com".
    for (const suffix of allowedOriginSuffixes) {
      if (suffix && host.endsWith(suffix.toLowerCase())) {
        callback(null, true);
        return;
      }
    }

    if (isDevelopment() && normalized.startsWith('http://localhost:')) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
