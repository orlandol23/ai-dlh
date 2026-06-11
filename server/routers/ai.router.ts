import { z } from 'zod';
import { router, protectedProcedure, rateLimitByUser } from '../trpc.js';
import { config } from '../utils/env.js';
import { aiService } from '../services/ai.service.js';
import { db } from '../db/index.js';
import { modules } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { getErrorMessage } from '../utils/errors.js';
import type { Region, Tier } from '../services/providers/types.js';

const SUPPORTED_LOCALES = ['en', 'pt-BR', 'es', 'fr', 'ja', 'ar'] as const;

/**
 * Region detection — v1 reads optional `x-region` header, defaults to 'global'.
 * Geo-IP based detection is left to v1.1.
 */
function detectRegion(req: { headers: { [k: string]: string | string[] | undefined } }): Region {
  const raw = req.headers['x-region'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'cn' || value === 'eu-strict') return value;
  return 'global';
}

/**
 * AI Router - Handles AI-powered module generation and management
 * 
 * Endpoints:
 * - generateModule: Generate new learning module with AI
 * - getUserModules: Get all modules for authenticated user
 * - getModuleById: Get specific module details
 * - deleteModule: Delete user's module
 */
export const aiRouter = router({
  /**
   * Generate a new learning module with AI
   *
   * Rate limited per user: each call spends Gemini API quota, so a single
   * user can't burn the whole project's daily allowance.
   */
  generateModule: protectedProcedure
    .use(
      rateLimitByUser({
        name: 'ai.generateModule',
        max: config.RATE_LIMIT_AI_GENERATE_PER_HOUR,
        windowMs: 60 * 60 * 1000,
      })
    )
    .input(
      z.object({
        topic: z.string().min(3).max(200, 'Topic must be between 3-200 characters'),
        level: z.enum(['beginner', 'intermediate', 'advanced']),
        locale: z.enum(SUPPORTED_LOCALES).default('pt-BR'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const tier: Tier =
          ctx.user.preferredTier === 'premium' ? 'premium' : 'default';
        const region: Region = detectRegion(ctx.req);

        const { content, provider } = await aiService.generateModule(
          input.topic,
          input.level,
          input.locale,
          { tier, region, locale: input.locale },
        );

        const [saved] = await db
          .insert(modules)
          .values({
            userId: ctx.user.id,
            title: content.title,
            content: content.content,
            topic: input.topic,
            level: input.level,
            locale: input.locale,
            provider,
            quizData: content.quiz,
            estimatedTime: content.estimatedTime,
          })
          .returning();

        return saved;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: getErrorMessage(error, 'Failed to generate module'),
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
