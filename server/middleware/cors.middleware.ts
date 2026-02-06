import cors from 'cors';
import { config } from '../utils/env.js';

/**
 * CORS configuration
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests from frontend URL or no origin (like mobile apps)
    const allowedOrigins = [
      config.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
    ];

    // In development, allow all localhost origins
    const isDevelopment = config.NODE_ENV === 'development';
    const isLocalhost = origin?.startsWith('http://localhost:');

    // Allow when no origin (server-to-server requests, native apps)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Allow explicit origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // Allow Vercel app domains (production and preview): *.vercel.app
    try {
      const originHost = new URL(origin).host;
      if (originHost.endsWith('.vercel.app')) {
        callback(null, true);
        return;
      }
    } catch (e) {
      // ignore URL parse errors
    }

    // Allow localhost in development
    if (isDevelopment && isLocalhost) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
