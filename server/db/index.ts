import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { config } from '../utils/env.js';
import { logger } from '../utils/logger.js';

// Create postgres connection
const connectionString = config.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

// Create postgres client
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,

  // postgres.js prints every server NOTICE to the console as a raw object,
  // one field per line. Every boot therefore dumps two harmless notices —
  // `42P06 schema "drizzle" already exists, skipping` and `42P07 relation
  // "__drizzle_migrations" already exists, skipping`, both from the
  // CREATE ... IF NOT EXISTS statements drizzle runs before applying
  // migrations. Split across lines in a log aggregator they read like a
  // stack trace, which makes a healthy deploy look broken.
  //
  // Route them through the logger at debug level instead: still there when
  // you need them (LOG_LEVEL=debug), silent when you don't. Anything the
  // server should actually act on arrives as a thrown error, not a notice.
  onnotice: (notice) => {
    logger.debug('postgres notice', {
      code: notice.code,
      severity: notice.severity,
      message: notice.message,
    });
  },
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export schema for queries
export { schema };

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
