-- Security P2: at most ONE payable progress record per (user, module).
-- A passing submission spends ETH from the custodial wallet, so without this
-- a module owner who learned the answers could resubmit to farm payouts.
--
-- Partial unique index: only rows whose blockchain_status is NOT 'none'
-- (pending/processing/confirmed/failed/failed_permanent) occupy the single
-- payout slot. Plain failed-quiz rows ('none') stay unconstrained, so a user
-- may still retake/fail the same module any number of times.
--
-- NOTE: drizzle-kit 0.20.x does not emit the `.where(...)` partial predicate
-- from the schema index builder (server/db/schema.ts), so the WHERE clause
-- below is maintained by hand. Keep them in sync.

-- Step 1 — self-heal existing data BEFORE building the unique index. The
-- pre-P2 submitQuiz (shipped with the queue, PR #20) enqueued a payout on
-- EVERY passing submission, so a module that was passed more than once may
-- already have several rows with blockchain_status <> 'none'. Building a
-- (non-concurrent) unique index over those duplicates would raise a
-- duplicate-key error and crash migrate-on-boot. Collapse each (user, module)
-- group to a single payable row — prefer a 'confirmed' (already on-chain) row,
-- otherwise the earliest — and downgrade the rest to 'none'. The score is
-- preserved; only the redundant payout marker is cleared. Idempotent: after it
-- runs there is at most one non-'none' row per group, so a re-run is a no-op.
UPDATE "progress_records" SET "blockchain_status" = 'none'
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT
      "id",
      row_number() OVER (
        PARTITION BY "user_id", "module_id"
        ORDER BY
          CASE "blockchain_status" WHEN 'confirmed' THEN 0 ELSE 1 END,
          "completed_at" ASC,
          "id" ASC
      ) AS rn
    FROM "progress_records"
    WHERE "blockchain_status" <> 'none'
  ) ranked
  WHERE ranked.rn > 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "progress_one_payout_per_module_idx" ON "progress_records" ("user_id","module_id") WHERE "blockchain_status" <> 'none';
