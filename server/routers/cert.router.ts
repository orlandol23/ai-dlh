import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db } from '../db/index.js';
import { progressRecords, modules, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

/**
 * Cert Router — public, read-only endpoints for shareable certificate pages.
 *
 * Used by /cert/:hash route. No auth required so links can be shared in
 * social media or LinkedIn previews without forcing the visitor to sign in.
 */
export const certRouter = router({
  /**
   * Resolve a certificate by Ethereum transaction hash.
   * Joins progress + module + user to return everything the cert page renders.
   */
  getByHash: publicProcedure
    .input(z.object({ hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid tx hash') }))
    .query(async ({ input }) => {
      // Public, unauthenticated endpoint. The module is joined for the
      // certificate header only, so this is an EXPLICIT column allow-list —
      // it selects topic/title/level and NEVER quizData (the answer key,
      // security P2). Keep it an allow-list: do not switch to `select *` or a
      // relational `with: { module: true }` here.
      const result = await db
        .select({
          score: progressRecords.score,
          completedAt: progressRecords.completedAt,
          transactionHash: progressRecords.transactionHash,
          blockchainStatus: progressRecords.blockchainStatus,
          walletAddress: users.walletAddress,
          topic: modules.topic,
          title: modules.title,
          level: modules.level,
        })
        .from(progressRecords)
        .innerJoin(modules, eq(progressRecords.moduleId, modules.id))
        .innerJoin(users, eq(progressRecords.userId, users.id))
        .where(eq(progressRecords.transactionHash, input.hash))
        .limit(1);

      const cert = result[0];
      if (!cert || cert.blockchainStatus !== 'confirmed') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Certificate not found' });
      }
      return cert;
    }),
});
