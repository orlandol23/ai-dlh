import { router, protectedProcedure } from '../trpc.js';
import { web3Service } from '../services/web3.service.js';
import { TRPCError } from '@trpc/server';

export const web3Router = router({
  /**
   * Get blockchain progress for current user
   */
  getBlockchainProgress: protectedProcedure.query(async ({ ctx }) => {
    try {
      const progress = await web3Service.getUserProgress(ctx.user.walletAddress);
      return progress;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to fetch blockchain data',
      });
    }
  }),

  /**
   * Get completion count from blockchain
   */
  getCompletionCount: protectedProcedure.query(async ({ ctx }) => {
    try {
      const count = await web3Service.getCompletionCount(ctx.user.walletAddress);
      return { count };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to fetch completion count',
      });
    }
  }),

  /**
   * Get average score from blockchain
   */
  getAverageScore: protectedProcedure.query(async ({ ctx }) => {
    try {
      const average = await web3Service.getAverageScore(ctx.user.walletAddress);
      return { average };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to fetch average score',
      });
    }
  }),

  /**
   * Get total completions on contract (global)
   */
  getTotalCompletions: protectedProcedure.query(async () => {
    try {
      const total = await web3Service.getTotalCompletions();
      return { total };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to fetch total completions',
      });
    }
  }),
});
