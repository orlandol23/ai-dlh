import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { authService } from '../services/auth.service.js';
import { TRPCError } from '@trpc/server';
import { getErrorMessage } from '../utils/errors.js';

export const authRouter = router({
  /**
   * Login with Web3 signature
   */
  login: publicProcedure
    .input(
      z.object({
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
        message: z.string().min(10),
        signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/, 'Invalid signature'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await authService.authenticateWithSignature(
          input.walletAddress,
          input.message,
          input.signature
        );

        return result;
      } catch (error) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: getErrorMessage(error, 'Authentication failed'),
        });
      }
    }),

  /**
   * Get current user profile
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),

  /**
   * Update user profile
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(255).optional(),
        email: z.string().email().optional(),
        avatar: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await authService.updateUserProfile(ctx.user.id, input);
      return updated;
    }),

  /**
   * Update user preferences — controls AI tier, locale and timezone defaults.
   *
   * preferredTier 'premium' activates Claude Sonnet routing for next module
   * generations (requires ANTHROPIC_API_KEY on the server).
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        preferredTier: z.enum(['default', 'premium']).optional(),
        preferredLocale: z
          .enum(['en', 'pt-BR', 'es', 'fr', 'ja', 'ar'])
          .nullable()
          .optional(),
        preferredTimezone: z.string().max(64).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await authService.updateUserPreferences(ctx.user.id, input);
      return updated;
    }),

  /**
   * Logout (client-side only, just invalidates token)
   */
  logout: protectedProcedure.mutation(() => {
    return { success: true };
  }),
});
