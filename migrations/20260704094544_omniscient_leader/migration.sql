CREATE TABLE "resume_version" (
	"id" text PRIMARY KEY,
	"resume_id" text NOT NULL,
	"user_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "resume_version_resume_id_created_at_index" ON "resume_version" ("resume_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "resume_version" ADD CONSTRAINT "resume_version_resume_id_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resume"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "resume_version" ADD CONSTRAINT "resume_version_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;