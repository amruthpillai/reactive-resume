CREATE TABLE "custom_template" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"data" jsonb NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "custom_template" ADD CONSTRAINT "custom_template_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "custom_template_user_id_index" ON "custom_template" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "custom_template_user_id_updated_at_index" ON "custom_template" USING btree ("user_id","updated_at" DESC);
