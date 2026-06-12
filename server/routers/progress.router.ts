import { z } from 'zod';
import { router, protectedProcedure, rateLimitByUser } from '../trpc.js';
import { config } from '../utils/env.js';
import { db } from '../db/index.js';
import { modules, progressRecords, type QuizQuestion } from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { logger } from '../utils/logger.js';

/**
 * `blockchain_error` stores server-side detail (RPC URLs, ethers internals)
 * and must never reach the client verbatim — every query that returns
 * progress records excludes it via this column mask. The frontend renders
 * a generic i18n message keyed off `blockchainStatus` instead.
 */
const CLIENT_SAFE_PROGRESS_COLUMNS = { blockchainError: false } as const;

/**
 * Progress Router - Handles quiz submissions and progress tracking
 *
 * Endpoints:
 * - submitQuiz: Submit quiz answers; passing scores are enqueued for the
 *   async blockchain queue worker (services/blockchain-queue.service.ts)
 * - retryBlockchain: Re-enqueue a record that ended up `failed_permanent`
 * - getUserProgress: Get up to 50 most recent progress records for user
 *   (capped — see endpoint comment for rationale)
 * - getStatistics: Get aggregated statistics computed in SQL
 *   (avg score, completion rate, achievement aggregates, capped streak)
 * - getModuleProgress: Get progress for specific module
 */
export const progressRouter = router({
  /**
   * Submit quiz answers and record progress
   *
   * Rate limited per user: passing submissions trigger an on-chain
   * transaction paid with ETH from the server's custodial wallet.
   */
  submitQuiz: protectedProcedure
    .use(
      rateLimitByUser({
        name: 'progress.submitQuiz',
        max: config.RATE_LIMIT_QUIZ_SUBMIT_PER_HOUR,
        windowMs: 60 * 60 * 1000,
      })
    )
    .input(
      z.object({
        moduleId: z.number(),
        answers: z.array(z.number().min(0).max(3)),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get module — ownership enforced in the query itself (same rule as
      // getModuleById/deleteModule). NOT_FOUND is returned for both
      // "doesn't exist" and "belongs to someone else" so module ids of
      // other users are not enumerable.
      const module = await db.query.modules.findFirst({
        where: and(
          eq(modules.id, input.moduleId),
          eq(modules.userId, ctx.user.id)
        ),
      });

      if (!module) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Module not found',
        });
      }

      // Security P2 (resolved): getModuleById serves the quiz WITHOUT
      // `correctAnswer`/`explanation` (see utils/public-module.ts). Grading
      // happens here, server-side, and the full answer key is only returned
      // in this mutation's response for the post-submit review screen.

      // Validate answers length
      const quizData = module.quizData as QuizQuestion[];
      if (input.answers.length !== quizData.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Answer count does not match quiz questions',
        });
      }

      // Calculate score
      let correct = 0;
      input.answers.forEach((answer, index) => {
        if (answer === quizData[index].correctAnswer) {
          correct++;
        }
      });

      const score = Math.round((correct / quizData.length) * 100);
      logger.info(`Quiz submitted: ${correct}/${quizData.length} correct (${score}%)`);

      // Save progress record. Passing scores are enqueued for the async
      // blockchain queue worker — this mutation no longer waits for the
      // on-chain confirmation (which can take minutes), it responds
      // immediately and the frontend polls `getModuleProgress` while the
      // record is pending/processing.
      const passed = score >= 70;
      const [record] = await db
        .insert(progressRecords)
        .values({
          userId: ctx.user.id,
          moduleId: input.moduleId,
          score,
          answersData: input.answers,
          blockchainStatus: passed ? 'pending' : 'none',
        })
        .returning();

      if (passed) {
        logger.info(
          `Progress record ${record.id} enqueued for on-chain recording (module ${input.moduleId})`
        );
      }

      return {
        recordId: record.id,
        score,
        correct,
        total: quizData.length,
        passed: score >= 70,
        transactionHash: txHash,
        blockchainError,
        // Answer key for the post-submit review screen. This is the ONLY
        // place the correct answers leave the server (security P2): the
        // quiz itself is served without them by ai.getModuleById.
        review: quizData.map((q, index) => ({
          correctAnswer: q.correctAnswer,
          explanation: q.explanation ?? null,
          isCorrect: input.answers[index] === q.correctAnswer,
        })),
      };
    }),

  /**
   * Re-enqueue an on-chain record that the queue worker gave up on
   * (`failed_permanent`) — exposed as the "tentar novamente" button in
   * the frontend.
   *
   * Ownership + state checks live in the UPDATE's WHERE itself, so the
   * whole thing is one atomic statement: a record that doesn't exist,
   * belongs to someone else, or isn't `failed_permanent` all come back
   * as "no row updated" → NOT_FOUND (no id enumeration).
   *
   * Rate limited per user: every retry can spend ETH from the custodial
   * wallet, so it gets its own tight budget.
   */
  retryBlockchain: protectedProcedure
    .use(
      rateLimitByUser({
        name: 'progress.retryBlockchain',
        max: config.RATE_LIMIT_BLOCKCHAIN_RETRY_PER_HOUR,
        windowMs: 60 * 60 * 1000,
      })
    )
    .input(z.object({ recordId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const updated = await db
        .update(progressRecords)
        .set({
          blockchainStatus: 'pending',
          blockchainAttempts: 0,
          blockchainNextAttemptAt: null,
          blockchainLockedAt: null,
          blockchainError: null,
        })
        .where(
          and(
            eq(progressRecords.id, input.recordId),
            eq(progressRecords.userId, ctx.user.id),
            eq(progressRecords.blockchainStatus, 'failed_permanent')
          )
        )
        .returning({ id: progressRecords.id });

      if (!updated[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No retryable record found',
        });
      }

      logger.info(
        `Progress record ${input.recordId} re-enqueued by user ${ctx.user.id}`
      );
      return { recordId: updated[0].id, blockchainStatus: 'pending' as const };
    }),

  /**
   * Get user's progress records (most recent first).
   *
   * Capped at 50 to keep the query result and response payload bounded.
   * The frontend's Sparkline only uses the last 12, and OnChainTimeline
   * shows recent activity, so returning full history would mostly add
   * unnecessary result size and sort cost for power users with thousands
   * of attempts (it's a single JOIN — not N×JOIN — but it's still O(n)
   * in rows scanned and serialized). Pagination can be added later
   * behind a cursor input if a "view all" UI shows up.
   *
   * Long-tail aggregates the achievements panel needs are computed in
   * `getStatistics` so they stay correct regardless of this cap.
   */
  getUserProgress: protectedProcedure.query(async ({ ctx }) => {
    const records = await db.query.progressRecords.findMany({
      where: eq(progressRecords.userId, ctx.user.id),
      orderBy: [desc(progressRecords.completedAt)],
      limit: 50,
      columns: CLIENT_SAFE_PROGRESS_COLUMNS,
      with: {
        // The joined module rides along only for title/topic in the UI —
        // exclude quizData so the answer key never leaks through this
        // endpoint either (security P2).
        module: { columns: { quizData: false } },
      },
    });

    return records;
  }),

  /**
   * Get statistics for current user.
   *
   * All counts/sums are pushed into Postgres via `COUNT(*) FILTER (...)`
   * and a separate `COUNT(DISTINCT modules.topic)` join, instead of
   * shipping every record to Node and folding in JS. For a power-user
   * with thousands of attempts this is the difference between O(n)
   * memory + a sort, and a couple of indexed scans returning a single
   * row each.
   *
   * Streak still needs the recent score sequence (it's order-dependent
   * and the threshold can change), so we fetch only the last 50 score
   * values — the longest realistic streak is bounded well below that.
   */
  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // None of the three queries depend on each other — issue them in
    // parallel via Promise.all to cut the endpoint's latency to roughly
    // the slowest single query instead of their sum.
    const [[aggregates], [topics], recentScores] = await Promise.all([
      // Single-table scan for the additive aggregates.
      db
        .select({
          total: sql<number>`COUNT(*)::int`,
          passed: sql<number>`COUNT(*) FILTER (WHERE ${progressRecords.score} >= 70)::int`,
          onChain: sql<number>`COUNT(*) FILTER (WHERE ${progressRecords.blockchainStatus} = 'confirmed')::int`,
          highScore: sql<number>`COUNT(*) FILTER (WHERE ${progressRecords.score} >= 90)::int`,
          hasPerfect: sql<boolean>`COALESCE(bool_or(${progressRecords.score} = 100), false)`,
          avgScore: sql<number>`COALESCE(ROUND(AVG(${progressRecords.score}))::int, 0)`,
        })
        .from(progressRecords)
        .where(eq(progressRecords.userId, userId)),

      // Distinct topics needs the join to modules — kept as its own
      // query so the aggregates above stay a single-table scan.
      db
        .select({ count: sql<number>`COUNT(DISTINCT ${modules.topic})::int` })
        .from(progressRecords)
        .innerJoin(modules, eq(progressRecords.moduleId, modules.id))
        .where(eq(progressRecords.userId, userId)),

      // Streak is order-dependent (consecutive passes from the most
      // recent backwards). Fetching only the columns we need keeps the
      // payload tiny; cap at 50 because no realistic streak survives
      // that long without hitting a sub-70 score. The returned field
      // is named `currentStreakCapped` so consumers know not to treat
      // it as exact past 50; achievement target is well within the cap.
      db
        .select({ score: progressRecords.score })
        .from(progressRecords)
        .where(eq(progressRecords.userId, userId))
        .orderBy(desc(progressRecords.completedAt))
        .limit(50),
    ]);

    let currentStreakCapped = 0;
    for (const r of recentScores) {
      if (r.score >= 70) currentStreakCapped += 1;
      else break;
    }

    const total = aggregates.total;
    return {
      totalModules: total,
      passedModules: aggregates.passed,
      avgScore: aggregates.avgScore,
      completionRate: total > 0 ? Math.round((aggregates.passed / total) * 100) : 0,
      onChainRecords: aggregates.onChain,
      highScoreCount: aggregates.highScore,
      hasPerfectScore: aggregates.hasPerfect,
      distinctTopicsCount: topics.count,
      // Capped at 50 — see comment above. Frontend's streak achievement
      // unlocks at 3, so the cap never affects unlock state in practice.
      currentStreakCapped,
    };
  }),

  /**
   * Get progress for a specific module
   */
  getModuleProgress: protectedProcedure
    .input(z.object({ moduleId: z.number() }))
    .query(async ({ input, ctx }) => {
      const record = await db.query.progressRecords.findFirst({
        where: and(
          eq(progressRecords.userId, ctx.user.id),
          eq(progressRecords.moduleId, input.moduleId)
        ),
        orderBy: [desc(progressRecords.completedAt)],
        columns: CLIENT_SAFE_PROGRESS_COLUMNS,
      });

      return record;
    }),
});
