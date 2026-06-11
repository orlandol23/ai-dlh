ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "locale" varchar(10) DEFAULT 'pt-BR' NOT NULL;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "provider" varchar(20) DEFAULT 'gemini' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_tier" varchar(20) DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_locale" varchar(10);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_timezone" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "learning_style" varchar(20);