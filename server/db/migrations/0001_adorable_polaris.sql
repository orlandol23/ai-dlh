CREATE TABLE IF NOT EXISTS "auth_nonces" (
	"id" serial PRIMARY KEY NOT NULL,
	"nonce" varchar(128) NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_nonces_nonce_wallet_idx" ON "auth_nonces" ("nonce","wallet_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_nonces_used_at_idx" ON "auth_nonces" ("used_at");