import rateLimit from 'express-rate-limit';
import { config } from '../utils/env.js';

/**
 * Global rate limiter (per IP).
 *
 * First line of defense against abusive clients hammering the API.
 * The limit is intentionally generous (default 300 req / 15 min per IP)
 * so it never bites real users — fine-grained, per-user limits for the
 * expensive procedures (AI generation, quiz submission) live as tRPC
 * middlewares (see utils/rate-limit.ts).
 *
 * Configurable via RATE_LIMIT_GLOBAL_MAX / RATE_LIMIT_GLOBAL_WINDOW_MS.
 *
 * Health-check endpoints are skipped so platform probes (Railway hits
 * /healthz frequently) never get throttled into a false "unhealthy".
 */
export const globalRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_GLOBAL_WINDOW_MS,
  limit: config.RATE_LIMIT_GLOBAL_MAX,
  standardHeaders: 'draft-7', // RateLimit-* headers
  legacyHeaders: false, // disable X-RateLimit-* headers
  skip: (req) => req.path === '/healthz' || req.path === '/health',
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
  },
});
