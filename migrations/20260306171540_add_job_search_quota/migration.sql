CREATE TABLE "job_search_quota" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL UNIQUE,
	"request_count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_search_quota" ADD CONSTRAINT "job_search_quota_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
