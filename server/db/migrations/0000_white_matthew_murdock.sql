CREATE TABLE IF NOT EXISTS "modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"topic" varchar(255) NOT NULL,
	"level" varchar(20) NOT NULL,
	"quiz_data" json NOT NULL,
	"estimated_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "progress_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"module_id" integer NOT NULL,
	"score" integer NOT NULL,
	"answers_data" json,
	"transaction_hash" varchar(66),
	"blockchain_status" varchar(20) NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"name" varchar(255),
	"email" varchar(255),
	"avatar" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "module_user_id_idx" ON "modules" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "module_topic_idx" ON "modules" ("topic");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "module_created_at_idx" ON "modules" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "progress_user_id_idx" ON "progress_records" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "progress_module_id_idx" ON "progress_records" ("module_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "progress_tx_hash_idx" ON "progress_records" ("transaction_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wallet_address_idx" ON "users" ("wallet_address");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "modules" ADD CONSTRAINT "modules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "progress_records" ADD CONSTRAINT "progress_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "progress_records" ADD CONSTRAINT "progress_records_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
