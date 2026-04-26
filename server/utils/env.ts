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

// Parse a comma-separated list of origins. Each entry is normalized via
// `new URL(x).origin`, so trailing slashes or paths are tolerated. Invalid
// entries produce a structured Zod error at boot (not a runtime crash in
// whatever consumer happens to touch the list first).
const csvOriginsSchema = z
  .string()
  .optional()
  .transform((value, ctx) => {
    const entries = (value ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const origins: string[] = [];
    for (const entry of entries) {
      try {
        origins.push(new URL(entry).origin);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `invalid origin: "${entry}" (expected e.g. "https://app.example.com")`,
        });
      }
    }
    return origins;
  });

// Platform-wide hosting suffixes that, if accepted alone, would let any
// tenant on that platform call this API — effectively re-enabling the
// wildcard this PR removed. Operators must use a project-scoped suffix
// (e.g. "-myorg.vercel.app") instead.
const KNOWN_BROAD_SUFFIXES = new Set<string>([
  'vercel.app',
  'netlify.app',
  'fly.dev',
  'herokuapp.com',
  'pages.dev',
  'railway.app',
  'onrender.com',
  'workers.dev',
  'web.app',
  'firebaseapp.com',
  'github.io',
  'gitlab.io',
]);

// Parse a comma-separated list of host suffixes (e.g. "-myorg.vercel.app").
// Restricted to hostname-safe characters plus optional port. Entries
// MUST start with "-" or "." so that `host.endsWith(suffix)` matches on
// a label boundary — without that, a suffix like "example.com" would
// also accept "evil-example.com". Entries that match a known broad
// platform suffix are also rejected at boot.
const csvSuffixesSchema = z
  .string()
  .optional()
  .transform((value, ctx) => {
    const entries = (value ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const entry of entries) {
      if (!/^[A-Za-z0-9._\-]+(?::\d+)?$/.test(entry)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `invalid host suffix: "${entry}" (expected e.g. "-myorg.vercel.app")`,
        });
        continue;
      }
      if (!entry.startsWith('-') && !entry.startsWith('.')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            `host suffix "${entry}" must start with "-" or "." to enforce a ` +
            `label boundary (e.g. "-myorg.vercel.app" or ".internal.example.com").`,
        });
        continue;
      }
      const naked = entry.replace(/^[.-]/, '').toLowerCase();
      if (KNOWN_BROAD_SUFFIXES.has(naked)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            `host suffix "${entry}" matches an entire hosting platform; ` +
            `use a project-scoped value like "-myorg.vercel.app" instead.`,
        });
      }
    }
    return entries;
  });

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // CORS: comma-separated list of exact origins (e.g. "https://app.example.com,https://staging.example.com").
  // Preview/wildcard matching is opt-in via ALLOWED_ORIGIN_SUFFIXES below.
  ALLOWED_ORIGINS: csvOriginsSchema,

  // Comma-separated list of host suffixes allowed for preview deploys
  // (e.g. "-myorg.vercel.app"). Leave unset to disable wildcard matching entirely.
  ALLOWED_ORIGIN_SUFFIXES: csvSuffixesSchema,

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Blockchain
  ETHEREUM_RPC_URL: z.string().url('ETHEREUM_RPC_URL must be a valid URL'),
  PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'PRIVATE_KEY must be a valid private key'),
  CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'CONTRACT_ADDRESS must be a valid address'),

  // AI — primary provider (always required)
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),

  // AI — optional providers (enable tier=premium / region=cn when set)
  ANTHROPIC_API_KEY: z.string().optional(),
  DASHSCOPE_API_KEY: z.string().optional(),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Max clock-skew / replay window for signed Web3 login messages (ms).
  AUTH_MESSAGE_MAX_AGE_MS: z
    .string()
    .default('300000') // 5 min
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(30_000).max(900_000)),

  // Operations
  // Skip drizzle migrate() on boot. Use when migrations are run by a
  // dedicated release-phase job and the running container should never
  // touch DDL. Default: false (apply migrations). Keep `.env.example`
  // in sync. Any value other than the literal "true" leaves migrations
  // enabled, so typos fail closed (apply migrations).
  SKIP_MIGRATIONS: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
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

// Allowlists already validated and normalized by the Zod schema above.
export const allowedOrigins: string[] = config.ALLOWED_ORIGINS;
export const allowedOriginSuffixes: string[] = config.ALLOWED_ORIGIN_SUFFIXES;

export const isProduction = () => config.NODE_ENV === 'production';
export const isDevelopment = () => config.NODE_ENV === 'development';
export const isTest = () => config.NODE_ENV === 'test';
