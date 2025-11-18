import { router } from '../trpc';
import { authRouter } from './auth.router';
import { aiRouter } from './ai.router';
import { progressRouter } from './progress.router';
import { web3Router } from './web3.router';

/**
 * Main application router
 * Combines all feature routers
 */
export const appRouter = router({
  auth: authRouter,
  ai: aiRouter,
  progress: progressRouter,
  web3: web3Router,
});

// Export type definition for client
export type AppRouter = typeof appRouter;
