-- Snapshot realignment for the drizzle-kit 0.20 → 0.31 upgrade. No schema change.
--
-- drizzle-kit 0.20.x silently dropped the `.where(...)` partial predicate from
-- index builders, so migration 0004 created the partial unique index by hand
-- and the stored snapshot recorded it WITHOUT the predicate. drizzle-kit 0.31
-- emits the predicate correctly, so the first `db:generate` after the upgrade
-- sees the snapshot (no predicate) drift from the schema (predicate) and wants
-- to rebuild the index.
--
-- The index below is byte-for-byte equivalent in effect to the one 0004 already
-- created — same columns, same partial predicate, btree is the default method.
-- Applying this is a redundant-but-harmless rebuild; its real purpose is to make
-- the snapshot match the schema so future `db:generate` diffs come out clean.
--
-- DROP uses IF EXISTS so the migration is safe to apply to a database that
-- somehow never got 0004's index (0004 itself used CREATE ... IF NOT EXISTS).
DROP INDEX IF EXISTS "progress_one_payout_per_module_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "progress_one_payout_per_module_idx" ON "progress_records" USING btree ("user_id","module_id") WHERE "progress_records"."blockchain_status" <> 'none';
