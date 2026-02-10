DROP INDEX "user_email_index";--> statement-breakpoint
DROP INDEX "user_username_index";--> statement-breakpoint
DROP INDEX "resume_statistics_resume_id_index";--> statement-breakpoint
DROP INDEX "verification_identifier_index";--> statement-breakpoint
CREATE INDEX "resume_created_at_index" ON "resume" ("created_at");--> statement-breakpoint
CREATE INDEX "user_created_at_index" ON "user" ("created_at");