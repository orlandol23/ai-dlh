import cors from 'cors';
import { config } from '../utils/env';

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

    if (!origin || allowedOrigins.includes(origin) || (isDevelopment && isLocalhost)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
