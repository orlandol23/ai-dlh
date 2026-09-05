import { pgTable, serial, varchar, text, integer, timestamp, json, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

/**
 * Users table - stores wallet addresses and user information
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  walletAddress: varchar('wallet_address', { length: 42 }).unique().notNull(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  avatar: varchar('avatar', { length: 500 }),
  preferredTier: varchar('preferred_tier', { length: 20 }).notNull().default('default'), // 'default' | 'premium'
  preferredLocale: varchar('preferred_locale', { length: 10 }),
  preferredTimezone: varchar('preferred_timezone', { length: 64 }),
  // VARK learning style detected by the onboarding questionnaire.
  // 'visual' | 'auditory' | 'reading_writing' | 'kinesthetic' — nullable
  // until the user takes the quiz. Conditions AI module generation
  // (see services/prompt-builder.ts). Fase 1 da fusão aprendaMais.
  learningStyle: varchar('learning_style', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
}, (table) => {
  return {
    walletAddressIdx: index('wallet_address_idx').on(table.walletAddress),
  };
});

/**
 * Quiz question interface
 */
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // 0-3
  explanation?: string;
}

/**
 * Modules table - stores AI-generated learning modules
 */
export const modules = pgTable('modules', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(), // Markdown content
  topic: varchar('topic', { length: 255 }).notNull(),
  level: varchar('level', { length: 20 }).notNull(), // beginner | intermediate | advanced
  locale: varchar('locale', { length: 10 }).notNull().default('pt-BR'),
  provider: varchar('provider', { length: 20 }).notNull().default('gemini'), // 'gemini' | 'claude' | 'qwen'
  quizData: json('quiz_data').$type<QuizQuestion[]>().notNull(),
  estimatedTime: integer('estimated_time'), // in minutes
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index('module_user_id_idx').on(table.userId),
    topicIdx: index('module_topic_idx').on(table.topic),
    createdAtIdx: index('module_created_at_idx').on(table.createdAt),
  };
});

/**
 * Possible values for `progress_records.blockchain_status`.
 *
 * Lifecycle (managed by services/blockchain-queue.service.ts):
 *   none             → score < 70, nothing to record on-chain
 *   pending          → enqueued, waiting for the worker to pick it up
 *   processing       → claimed by the worker, tx being sent right now
 *   confirmed        → tx mined; `transaction_hash` is set
 *   failed           → last attempt failed; will be retried after
 *                      `blockchain_next_attempt_at` (exponential backoff)
 *   failed_permanent → gave up (max attempts or non-retryable error);
 *                      only `progress.retryBlockchain` re-enqueues it
 */
export const BLOCKCHAIN_STATUSES = [
  'none',
  'pending',
  'processing',
  'confirmed',
  'failed',
  'failed_permanent',
] as const;
export type BlockchainStatus = (typeof BLOCKCHAIN_STATUSES)[number];

/**
 * Progress records table - stores quiz results and blockchain transactions
 */
export const progressRecords = pgTable('progress_records', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  moduleId: integer('module_id').references(() => modules.id).notNull(),
  score: integer('score').notNull(), // 0-100
  answersData: json('answers_data').$type<number[]>(), // array of answer indices
  transactionHash: varchar('transaction_hash', { length: 66 }),
  blockchainStatus: varchar('blockchain_status', { length: 20 }).notNull(), // see BLOCKCHAIN_STATUSES
  // On-chain queue bookkeeping (see services/blockchain-queue.service.ts):
  // number of send attempts already made (incremented at claim time).
  blockchainAttempts: integer('blockchain_attempts').notNull().default(0),
  // Earliest time the next retry may run (NULL = eligible immediately).
  blockchainNextAttemptAt: timestamp('blockchain_next_attempt_at'),
  // Set when the worker claims the row; rows stuck in 'processing' longer
  // than the stale-lock window are reclaimed (crash recovery).
  blockchainLockedAt: timestamp('blockchain_locked_at'),
  // Last error message (server-side detail, never sent verbatim to clients).
  blockchainError: text('blockchain_error'),
  // Exactly-once journal, written BETWEEN broadcasting the transaction and
  // waiting for its receipt (see blockchain-queue.service.processCandidate).
  // `blockchain_nonce` is the nonce the broadcast consumed; a reclaimed row
  // re-broadcasts THAT nonce instead of allocating a new one, so a crash in
  // the send/wait window can never produce a second on-chain record.
  blockchainNonce: integer('blockchain_nonce'),
  // JSON array of every hash sent for that nonce — the original plus each
  // fee-bump replacement. Recovery checks their receipts before resending.
  blockchainSentHashes: text('blockchain_sent_hashes'),
  completedAt: timestamp('completed_at').defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index('progress_user_id_idx').on(table.userId),
    moduleIdIdx: index('progress_module_id_idx').on(table.moduleId),
    txHashIdx: index('progress_tx_hash_idx').on(table.transactionHash),
    // The worker polls by (status, next_attempt_at); index keeps the
    // poll cheap as the table grows.
    blockchainStatusIdx: index('progress_blockchain_status_idx').on(table.blockchainStatus),
    // Security P2 — at most ONE payable record per (user, module). A passing
    // submission spends ETH from the custodial wallet, so this partial unique
    // index makes the "resubmit to farm payouts" race impossible at the DB
    // level: only one row per (user, module) may have a blockchain_status
    // other than 'none' (pending/processing/confirmed/failed/failed_permanent).
    // Plain failed-quiz rows ('none') are unconstrained. submitQuiz catches
    // the 23505 violation and records the loser as 'none'.
    // NOTE: drizzle-kit 0.20.x silently dropped this `.where()` predicate when
    // generating SQL, so 0004_ambiguous_rogue.sql wrote the partial clause by
    // hand. Since the 0.31 upgrade the predicate IS emitted (see
    // 0005_lucky_the_hunter.sql) — `db:generate` now keeps the two in sync on
    // its own, no hand-editing needed.
    onePayoutPerModule: uniqueIndex('progress_one_payout_per_module_idx')
      .on(table.userId, table.moduleId)
      .where(sql`${table.blockchainStatus} <> 'none'`),
  };
});

/**
 * Auth nonces - prevents replay of Web3 signature messages.
 * Each nonce can only be consumed once within its validity window.
 */
export const authNonces = pgTable('auth_nonces', {
  id: serial('id').primaryKey(),
  nonce: varchar('nonce', { length: 128 }).notNull(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  usedAt: timestamp('used_at').defaultNow().notNull(),
}, (table) => {
  return {
    nonceWalletUnique: uniqueIndex('auth_nonces_nonce_wallet_idx').on(table.nonce, table.walletAddress),
    usedAtIdx: index('auth_nonces_used_at_idx').on(table.usedAt),
  };
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type AuthNonce = typeof authNonces.$inferSelect;
export type NewAuthNonce = typeof authNonces.$inferInsert;

export type Module = typeof modules.$inferSelect;
export type NewModule = typeof modules.$inferInsert;

export type ProgressRecord = typeof progressRecords.$inferSelect;
export type NewProgressRecord = typeof progressRecords.$inferInsert;

/**
 * Drizzle relational-query mappings.
 *
 * `references()` on a column declares a SQL foreign key but does NOT teach
 * the relational query API (`db.query.X.findMany({ with: { ... } })`) how
 * to traverse it — that requires explicit `relations()` definitions, one
 * per side of the join. Without them, the query builder fails at runtime
 * when constructing the relational query with "Cannot read properties of
 * undefined (reading 'referencedTable')" inside drizzle-orm/relations.js,
 * which is exactly the error progress.getUserProgress was hitting in
 * production.
 */
export const usersRelations = relations(users, ({ many }) => ({
  modules: many(modules),
  progressRecords: many(progressRecords),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  user: one(users, {
    fields: [modules.userId],
    references: [users.id],
  }),
  progressRecords: many(progressRecords),
}));

export const progressRecordsRelations = relations(progressRecords, ({ one }) => ({
  user: one(users, {
    fields: [progressRecords.userId],
    references: [users.id],
  }),
  module: one(modules, {
    fields: [progressRecords.moduleId],
    references: [modules.id],
  }),
}));
