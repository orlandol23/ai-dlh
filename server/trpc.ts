import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context.js';
import superjson from 'superjson';
import { ZodError } from 'zod';

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
 * Middleware
 */
export const middleware = t.middleware;

/**
 * Merge routers
 */
export const mergeRouters = t.mergeRouters;
