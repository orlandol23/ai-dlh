ALTER TABLE "progress_records" ADD COLUMN "blockchain_lock_token" uuid;--> statement-breakpoint
COMMENT ON COLUMN "progress_records"."blockchain_lock_token" IS 'Identifies the claim currently holding this row. Minted fresh by every claim and required by every transition out of one: blockchain_status = ''processing'' says the row is held, not by whom, so a worker whose stale lock was reclaimed mid-send would otherwise overwrite the worker that holds it now.';--> statement-breakpoint
-- Rows already in flight when this migration runs hold a lock with no token,
-- which the constraint below rejects and the fence could not protect anyway.
-- Giving each one a token adopts it: the worker that claimed it is gone (this
-- migration runs at boot, so its process is being replaced), and the row stays
-- locked until the stale window expires and a live worker reclaims it under a
-- token of its own.
UPDATE "progress_records" SET "blockchain_lock_token" = gen_random_uuid() WHERE "blockchain_locked_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "progress_records" ADD CONSTRAINT "progress_lock_token_with_locked_at" CHECK (("progress_records"."blockchain_lock_token" IS NULL) = ("progress_records"."blockchain_locked_at" IS NULL));
