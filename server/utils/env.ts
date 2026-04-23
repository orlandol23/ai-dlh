import { z } from 'zod';
import * as dotenv from 'dotenv';

// Only load .env from the filesystem in non-production environments.
// In production (Vercel/Railway), env vars are injected by the platform
// and reading a local .env would be both unnecessary and a potential
// source of drift or accidental bundling.
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '../.env' });
}

// Values that must never be accepted in production. These are the
// placeholders shipped in .env.example; if they reach production it
// means the operator forgot to rotate the secret.
const JWT_SECRET_FORBIDDEN = new Set<string>([
  'your_super_secret_jwt_key_here_change_in_production',
  'your_generated_secret_here',
  'change_me',
]);

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // CORS: comma-separated list of exact origins (e.g. "https://app.example.com,https://staging.example.com").
  // Preview/wildcard matching is opt-in via ALLOWED_ORIGIN_SUFFIXES below.
  ALLOWED_ORIGINS: z.string().optional(),

  // Comma-separated list of host suffixes allowed for preview deploys
  // (e.g. "-myorg.vercel.app"). Leave unset to disable wildcard matching entirely.
  ALLOWED_ORIGIN_SUFFIXES: z.string().optional(),

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

  // Max clock-skew / replay window for signed Web3 login messages (ms).
  AUTH_MESSAGE_MAX_AGE_MS: z
    .string()
    .default('300000') // 5 min
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(30_000).max(900_000)),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === 'production' && JWT_SECRET_FORBIDDEN.has(env.JWT_SECRET)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_SECRET'],
      message: 'JWT_SECRET is a known placeholder. Rotate it before running in production.',
    });
  }
});

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

// Derived allowlists (parsed once at boot).
export const allowedOrigins: string[] = (config.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const allowedOriginSuffixes: string[] = (config.ALLOWED_ORIGIN_SUFFIXES ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const isProduction = () => config.NODE_ENV === 'production';
export const isDevelopment = () => config.NODE_ENV === 'development';
export const isTest = () => config.NODE_ENV === 'test';
