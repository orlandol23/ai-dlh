import { z } from 'zod';
import { router, protectedProcedure, rateLimitByUser } from '../trpc.js';
import { config } from '../utils/env.js';
import { db } from '../db/index.js';
import { modules, progressRecords, type QuizQuestion, type ProgressRecord } from '../db/schema.js';
import { eq, and, ne, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { logger } from '../utils/logger.js';

/**
 * PostgreSQL unique-violation SQLSTATE. Raised when the partial unique index
 * `progress_one_payout_per_module_idx` rejects a second payable row for the
 * same (user, module) — i.e. two passing submissions raced for the single
 * on-chain payout slot. We catch it to downgrade the loser to a no-payout
 * record instead of surfacing a 500.
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}

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

      // Security P2: the quiz is served WITHOUT `correctAnswer`/`explanation`
      // (ai.getModuleById → toPublicModule). Grading is 100% server-side here,
      // off the stored module — the client never sees the answer key before
      // submitting, and (see below) only after PASSING.

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

      const passed = score >= 70;

      // Security P2 — on-chain payout farming guard. Every passing submission
      // used to enqueue its OWN paid transaction (ETH from the custodial
      // wallet), so an owner who learned the answers could resubmit to drain
      // it. We now pay AT MOST ONCE per (user, module): if a payable record
      // already exists — any blockchain_status other than 'none' (pending,
      // processing, confirmed, failed, failed_permanent) — a repeat pass is
      // still recorded for history but does NOT enqueue a second payout.
      // The partial unique index `progress_one_payout_per_module_idx`
      // enforces this even under a concurrent race (caught below). A payout
      // that ended `failed_permanent` is recovered via `retryBlockchain`
      // (which re-enqueues the existing row), never by resubmitting the quiz.
      let alreadyRecorded = false;
      let shouldEnqueue = passed;
      if (passed) {
        const existingPayout = await db.query.progressRecords.findFirst({
          where: and(
            eq(progressRecords.userId, ctx.user.id),
            eq(progressRecords.moduleId, input.moduleId),
            ne(progressRecords.blockchainStatus, 'none')
          ),
          columns: { id: true },
        });
        if (existingPayout) {
          alreadyRecorded = true;
          shouldEnqueue = false;
        }
      }

      // Save progress record. Passing scores that win the payout slot are
      // enqueued for the async blockchain queue worker — this mutation never
      // waits for (or triggers) the on-chain write; the frontend polls
      // `getModuleProgress` while the record is pending/processing.
      const baseValues = {
        userId: ctx.user.id,
        moduleId: input.moduleId,
        score,
        answersData: input.answers,
      };
      let record: ProgressRecord;
      try {
        const [row] = await db
          .insert(progressRecords)
          .values({ ...baseValues, blockchainStatus: shouldEnqueue ? 'pending' : 'none' })
          .returning();
        record = row;
      } catch (error) {
        // Lost the race for the single payout slot — another passing
        // submission for this (user, module) enqueued first. Record the score
        // with no second payout instead of failing the request.
        if (!(shouldEnqueue && isUniqueViolation(error))) throw error;
        alreadyRecorded = true;
        shouldEnqueue = false;
        const [row] = await db
          .insert(progressRecords)
          .values({ ...baseValues, blockchainStatus: 'none' })
          .returning();
        record = row;
      }

      if (shouldEnqueue) {
        logger.info(
          `Progress record ${record.id} enqueued for on-chain recording (module ${input.moduleId})`
        );
      } else if (alreadyRecorded) {
        logger.info(
          `Module ${input.moduleId} already recorded on-chain for user ${ctx.user.id}; record ${record.id} stored without a duplicate payout`
        );
      }

      // Security P2 — the answer key is revealed ONLY after a passing
      // submission. A failing attempt gets per-question correctness (the
      // user's own grade) but NOT the correct answers/explanations, so a
      // deliberate fail can't harvest the full key to then resubmit. This
      // mutation's response is the only place correctAnswer/explanation ever
      // leave the server, and only once the quiz is genuinely passed.
      const reveal = passed;

      return {
        recordId: record.id,
        score,
        correct,
        total: quizData.length,
        passed,
        // true when this module's on-chain reward was already claimed by an
        // earlier passing submission: the score is saved, but no new
        // transaction is enqueued (the wallet can't be farmed).
        alreadyRecorded,
        // Queue-based flow (#20): the chain is NOT touched here — the worker
        // processes 'pending' records asynchronously; tx hash/errors never
        // leave the server from this mutation.
        blockchainStatus: record.blockchainStatus,
        review: quizData.map((q, index) => ({
          isCorrect: input.answers[index] === q.correctAnswer,
          correctAnswer: reveal ? q.correctAnswer : null,
          explanation: reveal ? q.explanation ?? null : null,
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
