import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { authService } from '../services/auth.service';
import { TRPCError } from '@trpc/server';

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
      } catch (error: any) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: error.message || 'Authentication failed',
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
   * Logout (client-side only, just invalidates token)
   */
  logout: protectedProcedure.mutation(() => {
    return { success: true };
  }),
});
