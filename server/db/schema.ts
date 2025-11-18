import { pgTable, serial, varchar, text, integer, timestamp, json, index } from 'drizzle-orm/pg-core';

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

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Module = typeof modules.$inferSelect;
export type NewModule = typeof modules.$inferInsert;

export type ProgressRecord = typeof progressRecords.$inferSelect;
export type NewProgressRecord = typeof progressRecords.$inferInsert;
