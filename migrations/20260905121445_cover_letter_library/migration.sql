CREATE TABLE "cover_letter" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"recipient" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"style" jsonb NOT NULL,
	"source_resume_id" text,
	"source_application_id" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "cover_letter_user_id_updated_at_id_index" ON "cover_letter" ("user_id","updated_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "cover_letter" ADD CONSTRAINT "cover_letter_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cover_letter" ADD CONSTRAINT "cover_letter_source_resume_id_resume_id_fkey" FOREIGN KEY ("source_resume_id") REFERENCES "resume"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cover_letter" ADD CONSTRAINT "cover_letter_source_application_id_application_id_fkey" FOREIGN KEY ("source_application_id") REFERENCES "application"("id") ON DELETE SET NULL;