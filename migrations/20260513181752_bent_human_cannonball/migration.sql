CREATE TABLE "agent_actions" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"message_id" text,
	"resume_id" text,
	"kind" text NOT NULL,
	"status" text DEFAULT 'applied' NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"operations" jsonb NOT NULL,
	"inverse_operations" jsonb NOT NULL,
	"base_updated_at" timestamp with time zone NOT NULL,
	"applied_updated_at" timestamp with time zone NOT NULL,
	"reverted_at" timestamp with time zone,
	"revert_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_attachments" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"message_id" text,
	"storage_key" text NOT NULL,
	"filename" text NOT NULL,
	"media_type" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_messages" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"sequence" integer NOT NULL,
	"ui_message" jsonb NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_threads" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"ai_provider_id" text,
	"source_resume_id" text,
	"working_resume_id" text,
	"title" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"active_run_id" text,
	"active_stream_id" text,
	"active_run_started_at" timestamp with time zone,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_providers" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"label" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"base_url" text,
	"encrypted_api_key" text NOT NULL,
	"api_key_salt" text NOT NULL,
	"api_key_hash" text NOT NULL,
	"api_key_preview" text NOT NULL,
	"test_status" text DEFAULT 'untested' NOT NULL,
	"test_error" text,
	"last_tested_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "agent_actions_thread_id_created_at_index" ON "agent_actions" ("thread_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "agent_actions_resume_id_index" ON "agent_actions" ("resume_id");--> statement-breakpoint
CREATE INDEX "agent_actions_message_id_index" ON "agent_actions" ("message_id");--> statement-breakpoint
CREATE INDEX "agent_attachments_thread_id_index" ON "agent_attachments" ("thread_id");--> statement-breakpoint
CREATE INDEX "agent_attachments_message_id_index" ON "agent_attachments" ("message_id");--> statement-breakpoint
CREATE INDEX "agent_attachments_user_id_index" ON "agent_attachments" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_messages_thread_id_sequence_index" ON "agent_messages" ("thread_id","sequence");--> statement-breakpoint
CREATE INDEX "agent_messages_user_id_created_at_index" ON "agent_messages" ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "agent_threads_user_id_status_last_message_at_index" ON "agent_threads" ("user_id","status","last_message_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "agent_threads_working_resume_id_index" ON "agent_threads" ("working_resume_id");--> statement-breakpoint
CREATE INDEX "agent_threads_ai_provider_id_index" ON "agent_threads" ("ai_provider_id");--> statement-breakpoint
CREATE INDEX "ai_providers_user_id_enabled_index" ON "ai_providers" ("user_id","enabled");--> statement-breakpoint
CREATE INDEX "ai_providers_user_id_last_used_at_index" ON "ai_providers" ("user_id","last_used_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ai_providers_user_id_created_at_index" ON "ai_providers" ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_thread_id_agent_threads_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "agent_threads"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_message_id_agent_messages_id_fkey" FOREIGN KEY ("message_id") REFERENCES "agent_messages"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_resume_id_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resume"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "agent_attachments" ADD CONSTRAINT "agent_attachments_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "agent_attachments" ADD CONSTRAINT "agent_attachments_thread_id_agent_threads_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "agent_threads"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "agent_attachments" ADD CONSTRAINT "agent_attachments_message_id_agent_messages_id_fkey" FOREIGN KEY ("message_id") REFERENCES "agent_messages"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_thread_id_agent_threads_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "agent_threads"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "agent_threads" ADD CONSTRAINT "agent_threads_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "agent_threads" ADD CONSTRAINT "agent_threads_ai_provider_id_ai_providers_id_fkey" FOREIGN KEY ("ai_provider_id") REFERENCES "ai_providers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "agent_threads" ADD CONSTRAINT "agent_threads_source_resume_id_resume_id_fkey" FOREIGN KEY ("source_resume_id") REFERENCES "resume"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "agent_threads" ADD CONSTRAINT "agent_threads_working_resume_id_resume_id_fkey" FOREIGN KEY ("working_resume_id") REFERENCES "resume"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "ai_providers" ADD CONSTRAINT "ai_providers_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;