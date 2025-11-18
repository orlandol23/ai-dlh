import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { aiService } from '../services/ai.service';
import { db } from '../db';
import { modules } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const aiRouter = router({
  /**
   * Generate a new learning module with AI
   */
  generateModule: protectedProcedure
    .input(
      z.object({
        topic: z.string().min(3).max(200, 'Topic must be between 3-200 characters'),
        level: z.enum(['beginner', 'intermediate', 'advanced']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Generate content with AI
        const content = await aiService.generateModule(input.topic, input.level);

        // Save to database
        const [saved] = await db
          .insert(modules)
          .values({
            userId: ctx.user.id,
            title: content.title,
            content: content.content,
            topic: input.topic,
            level: input.level,
            quizData: content.quiz,
            estimatedTime: content.estimatedTime,
          })
          .returning();

        return saved;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to generate module',
        });
      }
    }),

  /**
   * Get all modules for current user
   */
  getUserModules: protectedProcedure.query(async ({ ctx }) => {
    const userModules = await db.query.modules.findMany({
      where: eq(modules.userId, ctx.user.id),
      orderBy: [desc(modules.createdAt)],
    });

    return userModules;
  }),

  /**
   * Get a specific module by ID
   */
  getModuleById: protectedProcedure
    .input(z.object({ moduleId: z.number() }))
    .query(async ({ input, ctx }) => {
      const module = await db.query.modules.findFirst({
        where: eq(modules.id, input.moduleId),
      });

      if (!module) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Module not found',
        });
      }

      // Check if user owns this module
      if (module.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this module',
        });
      }

      return module;
    }),

  /**
   * Delete a module
   */
  deleteModule: protectedProcedure
    .input(z.object({ moduleId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const module = await db.query.modules.findFirst({
        where: eq(modules.id, input.moduleId),
      });

      if (!module) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Module not found',
        });
      }

      if (module.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot delete this module',
        });
      }

      await db.delete(modules).where(eq(modules.id, input.moduleId));

      return { success: true };
    }),
});
