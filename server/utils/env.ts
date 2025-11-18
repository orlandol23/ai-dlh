import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

// Environment schema
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Blockchain
  ETHEREUM_RPC_URL: z.string().url('ETHEREUM_RPC_URL must be a valid URL'),
  PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'PRIVATE_KEY must be a valid private key'),
  CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'CONTRACT_ADDRESS must be a valid address'),

  // AI
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
});

// Parse and validate environment variables
let parsedEnv: z.infer<typeof envSchema>;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    console.error(error.errors.map(e => `  - ${e.path.join('.')}: ${e.message}`).join('\n'));
    process.exit(1);
  }
  throw error;
}

export const config = parsedEnv;

// Helper to check if in production
export const isProduction = () => config.NODE_ENV === 'production';
export const isDevelopment = () => config.NODE_ENV === 'development';
export const isTest = () => config.NODE_ENV === 'test';
