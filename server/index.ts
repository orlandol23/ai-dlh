import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { appRouter } from './routers/index.js';
import { createContext } from './context.js';
import { corsMiddleware } from './middleware/cors.middleware.js';
import { globalRateLimiter } from './middleware/rate-limit.middleware.js';
import { logger } from './utils/logger.js';
import { config } from './utils/env.js';
import { initSentry, captureException } from './utils/sentry.js';
import { checkDatabaseConnection, db } from './db/index.js';
import { web3Service } from './services/web3.service.js';
import { aiService } from './services/ai.service.js';
import { blockchainQueueService } from './services/blockchain-queue.service.js';
import { walletMonitorService } from './services/wallet-monitor.service.js';

/**
 * Apply pending Drizzle migrations on cold boot.
 *
 * Drizzle records applied migrations in `__drizzle_migrations`, so this is
 * idempotent — a server that restarts on an already-migrated database
 * does nothing here. We block the listen call until it finishes so a
 * partially-migrated DB never serves traffic; if the migration fails
 * the process exits non-zero and Railway restarts the deployment.
 *
 * Disable with SKIP_MIGRATIONS=true (e.g., when migrations are run by a
 * separate one-off job during release).
 */
async function runMigrations(): Promise<void> {
  if (config.SKIP_MIGRATIONS) {
    logger.info('Migrations skipped (SKIP_MIGRATIONS=true)');
    return;
  }

  // Resolve relative to *this* module so the path stays correct
  // regardless of CWD. The compiled binary lives at server/dist/index.js
  // (migrations are one level up: ../db/migrations); when running via
  // `tsx watch index.ts` this file IS at server/index.ts, so migrations
  // sit beside it (./db/migrations). Probe both and use whichever exists.
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(moduleDir, '..', 'db', 'migrations'), // compiled (dist/)
    path.resolve(moduleDir, 'db', 'migrations'),       // dev (tsx watch)
  ];
  const migrationsFolder = candidates.find((p) => fs.existsSync(p)) ?? candidates[0];

  logger.info(`Applying migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  logger.info('Migrations applied');
}

// Observability (C1): no-op unless SENTRY_DSN is set — see utils/sentry.ts.
initSentry();

// Create Express app
const app = express();

// Behind Railway's proxy the client IP arrives via X-Forwarded-For.
// Trust exactly one proxy hop so express-rate-limit keys on the real
// client IP instead of the proxy's (or a spoofable header chain).
app.set('trust proxy', 1);

// Middleware
app.use(globalRateLimiter);
app.use(express.json());
app.use(corsMiddleware);

// Simple health check for Railway (always returns 200).
// `walletBalanceLow` comes from the wallet monitor's cached snapshot —
// no RPC round-trip here, so the endpoint stays instant. Null until the
// first periodic check completes.
app.get('/healthz', (req, res) => {
  res.status(200).json({
    status: 'ok',
    walletBalanceLow: walletMonitorService.isBalanceLow(),
  });
});

// Detailed health check endpoint
app.get('/health', async (req, res) => {
  const dbOk = await checkDatabaseConnection();
  const blockchainOk = await web3Service.testConnection();
  const aiOk = await aiService.testConnection();

  const healthy = dbOk && blockchainOk && aiOk;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'ok' : 'error',
      blockchain: blockchainOk ? 'ok' : 'error',
      ai: aiOk ? 'ok' : 'error',
    },
    // Cached snapshot from the periodic monitor (null until first check).
    // A low balance does NOT flip the endpoint to 503 — the service still
    // works, it's an operational warning to top up the wallet.
    wallet: walletMonitorService.getStatus(),
  });
});

// tRPC endpoint
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, type, path }) {
      logger.error(`tRPC Error [${type}] ${path}:`, error);
      // Only unexpected failures go to Sentry. Expected client errors
      // (UNAUTHORIZED, BAD_REQUEST, TOO_MANY_REQUESTS, ...) are part of
      // normal operation and would drown the free tier in noise.
      if (error.code === 'INTERNAL_SERVER_ERROR') {
        captureException(error.cause ?? error, { trpcType: type, trpcPath: path });
      }
    },
  })
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
  });
});

// Error handler
// The unused 4th parameter is required: Express identifies error-handling
// middleware by arity (fn.length === 4). Prefixed with _ to satisfy lint.
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  captureException(err, { method: req.method, path: req.path });
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

// Start server (after migrations succeed)
const PORT = parseInt(config.PORT);
const HOST = '0.0.0.0'; // Listen on all interfaces for Railway

try {
  await runMigrations();
} catch (error) {
  logger.error('Failed to apply migrations; refusing to start server', { error });
  process.exit(1);
}

app.listen(PORT, HOST, () => {
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('  AI-DLH Backend Server Started');
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info(`🚀 Server running on ${HOST}:${PORT}`);
  logger.info(`📍 Environment: ${config.NODE_ENV}`);
  logger.info(`🔗 API: http://localhost:${PORT}/trpc`);
  logger.info(`❤️  Health: http://localhost:${PORT}/health`);
  logger.info('═══════════════════════════════════════════════════════════');
});

// Background workers (in-process; see each service for the single-instance
// caveats). Started after listen so a worker crash on boot never blocks
// the health check from coming up.
blockchainQueueService.start();
walletMonitorService.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  blockchainQueueService.stop();
  walletMonitorService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  blockchainQueueService.stop();
  walletMonitorService.stop();
  process.exit(0);
});

export { app };
