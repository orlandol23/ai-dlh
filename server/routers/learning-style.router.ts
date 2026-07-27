import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import {
  LEARNING_STYLES,
  VARK_QUESTION_COUNT,
  countVarkAnswers,
  computeDominantStyle,
} from '../services/vark.js';

/**
 * Learning Style Router — VARK questionnaire persistence.
 *
 * Fase 1 da fusão aprendaMais: the frontend
 * sends the raw per-question answers (one style per question) and the
 * dominant style is computed and persisted server-side, so the stored
 * value can never disagree with the submitted answers.
 *
 * The persisted style is exposed automatically through `auth.me` /
 * `auth.login` (both return the full user row).
 */
export const learningStyleRouter = router({
  /**
   * Submit the 15 VARK answers, compute the dominant style and persist it.
   *
   * Tie-breaking is deterministic (visual > auditory > reading_writing >
   * kinesthetic on the max count); `isMultimodal` tells the UI when the
   * profile was actually a tie so it can present the multimodal reading.
   */
  submitVarkResult: protectedProcedure
    .input(
      z.object({
        answers: z
          .array(z.enum(LEARNING_STYLES))
          .length(
            VARK_QUESTION_COUNT,
            `Must answer exactly ${VARK_QUESTION_COUNT} questions`,
          ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const counts = countVarkAnswers(input.answers);
      const { style, isMultimodal } = computeDominantStyle(counts);

      const [updated] = await db
        .update(users)
        .set({ learningStyle: style })
        .where(eq(users.id, ctx.user.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to persist learning style',
        });
      }

      return { user: updated, style, counts, isMultimodal };
    }),

  /** Reset the stored style (lets the user retake the quiz from scratch). */
  clearLearningStyle: protectedProcedure.mutation(async ({ ctx }) => {
    const [updated] = await db
      .update(users)
      .set({ learningStyle: null })
      .where(eq(users.id, ctx.user.id))
      .returning();

    if (!updated) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to clear learning style',
      });
    }

    return { user: updated };
  }),
});
