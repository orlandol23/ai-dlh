import { inferAsyncReturnType } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { authService } from './services/auth.service.js';
import { logger } from './utils/logger.js';
import { User } from './db/schema.js';

/**
 * Creates context for tRPC requests
 */
export async function createContext({ req, res }: CreateExpressContextOptions) {
  // Get token from authorization header
  const token = req.headers.authorization?.replace('Bearer ', '');

  let user: User | null = null;

  if (token) {
    try {
      const payload = authService.verifyToken(token);
      if (payload) {
        user = await authService.getUserById(payload.userId);
      }
    } catch (error) {
      logger.warn('Invalid token in request');
    }
  }

  return {
    req,
    res,
    user,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
