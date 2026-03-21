CREATE TABLE "oauth_access_token" (
	"id" uuid PRIMARY KEY,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone NOT NULL,
	"refresh_token_expires_at" timestamp with time zone,
	"client_id" text NOT NULL,
	"user_id" uuid,
	"scopes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_application" (
	"id" uuid PRIMARY KEY,
	"client_id" text NOT NULL UNIQUE,
	"client_secret" text,
	"name" text NOT NULL,
	"icon" text,
	"redirect_urls" text NOT NULL,
	"metadata" text,
	"type" text DEFAULT 'web' NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_consent" (
	"id" uuid PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"scopes" text,
	"consent_given" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "oauth_access_token_access_token_index" ON "oauth_access_token" ("access_token");--> statement-breakpoint
CREATE INDEX "oauth_access_token_refresh_token_index" ON "oauth_access_token" ("refresh_token");--> statement-breakpoint
CREATE INDEX "oauth_application_client_id_index" ON "oauth_application" ("client_id");--> statement-breakpoint
CREATE INDEX "oauth_consent_user_id_client_id_index" ON "oauth_consent" ("user_id","client_id");--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_application" ADD CONSTRAINT "oauth_application_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_consent" ADD CONSTRAINT "oauth_consent_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;