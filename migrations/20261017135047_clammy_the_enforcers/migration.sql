CREATE TABLE "ai_content_report" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"reason" text NOT NULL,
	"content" text NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "ai_content_report_reviewed_at_created_at_index" ON "ai_content_report" ("reviewed_at","created_at");--> statement-breakpoint
ALTER TABLE "ai_content_report" ADD CONSTRAINT "ai_content_report_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;