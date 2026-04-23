import cors from 'cors';
import { config, allowedOrigins, allowedOriginSuffixes, isDevelopment } from '../utils/env.js';

/**
 * CORS configuration.
 *
 * Previously we allowed any `*.vercel.app` host, which meant any Vercel
 * deployment (including unrelated ones) could call this API. That wildcard
 * is removed: origins must now match an explicit allowlist.
 *
 *  - `FRONTEND_URL`             → always allowed.
 *  - `ALLOWED_ORIGINS`          → comma-separated exact origins.
 *  - `ALLOWED_ORIGIN_SUFFIXES`  → comma-separated host suffixes (e.g.
 *                                 "-myorg.vercel.app") for preview deploys.
 *  - In development, localhost is allowed.
 */
const alwaysAllowed = new Set<string>([
  config.FRONTEND_URL,
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

    if (alwaysAllowed.has(origin)) {
      callback(null, true);
      return;
    }

    let host: string;
    try {
      host = new URL(origin).host;
    } catch {
      callback(new Error('Not allowed by CORS'));
      return;
    }

    // Preview deploys: host must end with one of the configured suffixes.
    for (const suffix of allowedOriginSuffixes) {
      if (suffix && host.endsWith(suffix)) {
        callback(null, true);
        return;
      }
    }

    if (isDevelopment() && origin.startsWith('http://localhost:')) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
