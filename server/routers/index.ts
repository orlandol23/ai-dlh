import { router } from '../trpc.js';
import { authRouter } from './auth.router.js';
import { aiRouter } from './ai.router.js';
import { progressRouter } from './progress.router.js';
import { web3Router } from './web3.router.js';
import { certRouter } from './cert.router.js';
import { learningStyleRouter } from './learning-style.router.js';

/**
 * Main application router
 * Combines all feature routers
 */
export const appRouter = router({
  auth: authRouter,
  ai: aiRouter,
  progress: progressRouter,
  web3: web3Router,
  cert: certRouter,
  learningStyle: learningStyleRouter,
});

// Export type definition for client
export type AppRouter = typeof appRouter;
