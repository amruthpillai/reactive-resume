ALTER TABLE "apikey" ALTER COLUMN "rate_limit_time_window" SET DEFAULT 86400000;--> statement-breakpoint
ALTER TABLE "apikey" ALTER COLUMN "rate_limit_max" SET DEFAULT 10;--> statement-breakpoint
ALTER TABLE "two_factor" ALTER COLUMN "secret" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "two_factor" ALTER COLUMN "backup_codes" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "apikey_config_id_index" ON "apikey" ("config_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_index" ON "verification" ("identifier");