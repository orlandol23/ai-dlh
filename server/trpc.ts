import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context.js';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { SlidingWindowRateLimiter } from './utils/rate-limit.js';
import { logger } from './utils/logger.js';

// Initialize tRPC with context
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

// Export reusable router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Auth middleware - ensures user is authenticated
 */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Now user is guaranteed to be non-null
    },
  });
});

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(isAuthed);

/**
 * Per-user rate limit middleware factory.
 *
 * Intended for expensive procedures (AI generation spends Gemini quota,
 * quiz submission can spend ETH from the server's custodial wallet).
 * Each call to this factory owns its own in-memory sliding window, so
 * limits are independent per procedure.
 *
 * Must be chained after authentication (e.g. `protectedProcedure.use(...)`)
 * since the window is keyed by user id; unauthenticated requests are
 * rejected defensively.
 */
export function rateLimitByUser(options: {
  /** Procedure name, used in logs (e.g. "ai.generateModule"). */
  name: string;
  /** Max allowed calls per user within the window. */
  max: number;
  /** Window size in milliseconds. */
  windowMs: number;
}) {
  const limiter = new SlidingWindowRateLimiter({
    windowMs: options.windowMs,
    max: options.max,
  });

  return t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource',
      });
    }

    const result = limiter.consume(String(ctx.user.id));
    if (!result.allowed) {
      logger.warn(
        `Rate limit exceeded on ${options.name} (user=${ctx.user.id}, limit=${options.max}/${options.windowMs}ms)`
      );
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded for this operation. Try again in ~${result.retryAfterSeconds}s.`,
      });
    }

    return next();
  });
}

/**
 * Middleware
 */
export const middleware = t.middleware;

/**
 * Merge routers
 */
export const mergeRouters = t.mergeRouters;
