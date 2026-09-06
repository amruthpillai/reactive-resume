CREATE TABLE "resume_retired_link" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"resume_id" text NOT NULL,
	"username" text NOT NULL,
	"slug" text NOT NULL,
	"retired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	CONSTRAINT "resume_retired_link_username_slug_unique" UNIQUE("username","slug")
);
--> statement-breakpoint
CREATE INDEX "resume_retired_link_resume_id_retired_at_index" ON "resume_retired_link" ("resume_id","retired_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "resume_retired_link" ADD CONSTRAINT "resume_retired_link_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "resume_retired_link" ADD CONSTRAINT "resume_retired_link_resume_id_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resume"("id") ON DELETE CASCADE;