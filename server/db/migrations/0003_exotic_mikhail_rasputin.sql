ALTER TABLE "progress_records" ADD COLUMN "blockchain_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "progress_records" ADD COLUMN "blockchain_next_attempt_at" timestamp;--> statement-breakpoint
ALTER TABLE "progress_records" ADD COLUMN "blockchain_locked_at" timestamp;--> statement-breakpoint
ALTER TABLE "progress_records" ADD COLUMN "blockchain_error" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "progress_blockchain_status_idx" ON "progress_records" ("blockchain_status");