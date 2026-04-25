import { pgTable, serial, varchar, text, integer, timestamp, json, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Users table - stores wallet addresses and user information
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  walletAddress: varchar('wallet_address', { length: 42 }).unique().notNull(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  avatar: varchar('avatar', { length: 500 }),
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
 * Progress records table - stores quiz results and blockchain transactions
 */
export const progressRecords = pgTable('progress_records', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  moduleId: integer('module_id').references(() => modules.id).notNull(),
  score: integer('score').notNull(), // 0-100
  answersData: json('answers_data').$type<number[]>(), // array of answer indices
  transactionHash: varchar('transaction_hash', { length: 66 }),
  blockchainStatus: varchar('blockchain_status', { length: 20 }).notNull(), // pending | confirmed | failed | none
  completedAt: timestamp('completed_at').defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index('progress_user_id_idx').on(table.userId),
    moduleIdIdx: index('progress_module_id_idx').on(table.moduleId),
    txHashIdx: index('progress_tx_hash_idx').on(table.transactionHash),
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
