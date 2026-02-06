import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { db } from '../db/index.js';
import { modules, progressRecords, type QuizQuestion } from '../db/schema.js';
import { web3Service } from '../services/web3.service.js';
import { eq, and, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { logger } from '../utils/logger.js';

/**
 * Progress Router - Handles quiz submissions and progress tracking
 * 
 * Endpoints:
 * - submitQuiz: Submit quiz answers and record on blockchain if passing
 * - getUserProgress: Get all progress records for user
 * - getStatistics: Get aggregated statistics (avg score, completion rate, etc.)
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
        } catch (error: any) {
          logger.error('Blockchain recording failed:', error);
          blockchainError = error.message;

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
   * Get user's progress records
   */
  getUserProgress: protectedProcedure.query(async ({ ctx }) => {
    const records = await db.query.progressRecords.findMany({
      where: eq(progressRecords.userId, ctx.user.id),
      orderBy: [desc(progressRecords.completedAt)],
      with: {
        module: true,
      },
    });

    return records;
  }),

  /**
   * Get statistics for current user
   */
  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    const records = await db.query.progressRecords.findMany({
      where: eq(progressRecords.userId, ctx.user.id),
    });

    const total = records.length;
    const passed = records.filter((r) => r.score >= 70).length;
    const avgScore =
      total > 0
        ? Math.round(records.reduce((sum, r) => sum + r.score, 0) / total)
        : 0;

    const onChain = records.filter(
      (r) => r.blockchainStatus === 'confirmed'
    ).length;

    return {
      totalModules: total,
      passedModules: passed,
      avgScore,
      completionRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      onChainRecords: onChain,
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
