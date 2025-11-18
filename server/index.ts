import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './context';
import { corsMiddleware } from './middleware/cors.middleware';
import { logger } from './utils/logger';
import { config } from './utils/env';
import { checkDatabaseConnection } from './db';
import { web3Service } from './services/web3.service';
import { aiService } from './services/ai.service';

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(corsMiddleware);

// Health check endpoint
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
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

// Start server
const PORT = parseInt(config.PORT);

app.listen(PORT, () => {
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('  AI-DLH Backend Server Started');
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${config.NODE_ENV}`);
  logger.info(`🔗 API: http://localhost:${PORT}/trpc`);
  logger.info(`❤️  Health: http://localhost:${PORT}/health`);
  logger.info('═══════════════════════════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export { app };
