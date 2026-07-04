CREATE TABLE "resume_statistics_daily" (
	"id" text PRIMARY KEY,
	"date" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"downloads" integer DEFAULT 0 NOT NULL,
	"resume_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resume_statistics_daily_resume_id_date_unique" UNIQUE("resume_id","date")
);
--> statement-breakpoint
CREATE INDEX "resume_statistics_daily_resume_id_date_index" ON "resume_statistics_daily" ("resume_id","date" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "resume_statistics_daily" ADD CONSTRAINT "resume_statistics_daily_resume_id_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resume"("id") ON DELETE CASCADE;