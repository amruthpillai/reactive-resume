ALTER TABLE "user" ADD COLUMN "last_active_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "apikey" ALTER COLUMN "config_id" SET DEFAULT 'default';