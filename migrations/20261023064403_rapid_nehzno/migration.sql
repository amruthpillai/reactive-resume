CREATE TABLE "released_username" (
	"username" text PRIMARY KEY,
	"user_id" text,
	"released_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE FUNCTION "reserve_released_username"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		IF NOT OLD."is_anonymous" THEN
			INSERT INTO "released_username" ("username", "user_id", "released_at") VALUES (OLD."username", NULL, now())
			ON CONFLICT ("username") DO UPDATE SET "user_id" = NULL, "released_at" = now();
		END IF;
		RETURN OLD;
	END IF;
	IF NEW."username" IS DISTINCT FROM OLD."username" AND NOT OLD."is_anonymous" THEN
		INSERT INTO "released_username" ("username", "user_id", "released_at") VALUES (OLD."username", OLD."id", now())
		ON CONFLICT ("username") DO UPDATE SET "user_id" = EXCLUDED."user_id", "released_at" = now();
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "user_released_username" AFTER UPDATE OF "username" OR DELETE ON "user" FOR EACH ROW EXECUTE FUNCTION "reserve_released_username"();
