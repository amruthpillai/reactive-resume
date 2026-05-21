CREATE TABLE "template" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"description" text,
	"author" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"files" jsonb NOT NULL,
	"metadata" jsonb NOT NULL,
	"inputs" jsonb NOT NULL,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "template_user_id_index" ON "template" ("user_id");--> statement-breakpoint
CREATE INDEX "template_created_at_index" ON "template" ("created_at");--> statement-breakpoint
ALTER TABLE "template" ADD CONSTRAINT "template_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;