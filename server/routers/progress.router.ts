import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { db } from '../db/index.js';
import { modules, progressRecords, type QuizQuestion } from '../db/schema.js';
import { web3Service } from '../services/web3.service.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { logger } from '../utils/logger.js';
import { getErrorMessage } from '../utils/errors.js';

/**
 * Progress Router - Handles quiz submissions and progress tracking
 *
 * Endpoints:
 * - submitQuiz: Submit quiz answers and record on blockchain if passing
 * - getUserProgress: Get up to 50 most recent progress records for user
 *   (capped — see endpoint comment for rationale)
 * - getStatistics: Get aggregated statistics computed in SQL
 *   (avg score, completion rate, achievement aggregates, capped streak)
 * - getModuleProgress: Get progress for specific module
 */
export const progressRouter = router({
  /**
   * Submit quiz answers and record progress
   */
  submitQuiz: protectedProcedure
    .input(
      z.object({
        moduleId: z.number(),
        answers: z.array(z.number().min(0).max(3)),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get module
      const module = await db.query.modules.findFirst({
        where: eq(modules.id, input.moduleId),
      });

      if (!module) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Module not found',
        });
      }

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

      // Save progress record
      const [record] = await db
        .insert(progressRecords)
        .values({
          userId: ctx.user.id,
          moduleId: input.moduleId,
          score,
          answersData: input.answers,
          blockchainStatus: score >= 70 ? 'pending' : 'none',
        })
        .returning();

      // If passed (score >= 70%), record on blockchain
      let txHash: string | null = null;
      let blockchainError: string | null = null;

      if (score >= 70) {
        try {
          logger.info('Recording completion on blockchain...');
          const tx = await web3Service.recordCompletion(
            input.moduleId,
            score,
            module.topic
          );
          txHash = tx.hash;

          // Update record with transaction hash
          await db
            .update(progressRecords)
            .set({
              transactionHash: txHash,
              blockchainStatus: 'confirmed',
            })
            .where(eq(progressRecords.id, record.id));

          logger.info(`Blockchain transaction confirmed: ${txHash}`);
        } catch (error) {
          logger.error('Blockchain recording failed', { error });
          blockchainError = getErrorMessage(error, 'Blockchain recording failed');

          // Update status to failed
          await db
            .update(progressRecords)
            .set({ blockchainStatus: 'failed' })
            .where(eq(progressRecords.id, record.id));
        }
      }

      return {
        score,
        correct,
        total: quizData.length,
        passed: score >= 70,
        transactionHash: txHash,
        blockchainError,
      };
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
      with: {
        module: true,
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
      });

      return record;
    }),
});
