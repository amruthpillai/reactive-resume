-- Better Auth 1.7 scopes account identity to (issuer, accountId) instead of providerId alone.
-- `findCredentialAccount`, `findAccountByKey`, and `findAccountOwnerByKey` all filter on `issuer`,
-- so every sign-in fails until this column exists and is backfilled to match what the runtime
-- computes for each provider.
--
-- Issuer values below mirror better-auth@1.7.1 exactly:
--   * credential      -> `local:credential`, with accountId normalised to the user id
--   * google          -> `https://accounts.google.com`   (social-providers/google.mjs: accountIssuer)
--   * github/linkedin -> `local:oauth:<id>`              (no accountIssuer -> createOAuthAccountIssuer)
--   * anything else   -> `local:oauth:<id>`              (same fallback)
--
-- Generic-OAuth providers configured with OAUTH_DISCOVERY_URL resolve their issuer from discovery
-- at runtime, which is deployment-specific and cannot be known here. Those rows get the
-- `local:oauth:<id>` fallback; see docs/self-hosting/sso.mdx for the one-line UPDATE they need.

ALTER TABLE "account" ADD COLUMN "issuer" text;--> statement-breakpoint

UPDATE "account" SET "issuer" = 'local:credential', "account_id" = "user_id" WHERE "provider_id" = 'credential';--> statement-breakpoint

UPDATE "account" SET "issuer" = 'https://accounts.google.com' WHERE "provider_id" = 'google';--> statement-breakpoint

UPDATE "account" SET "issuer" = 'local:oauth:' || "provider_id" WHERE "issuer" IS NULL;--> statement-breakpoint

DO $$
DECLARE
	collisions bigint;
BEGIN
	SELECT count(*) INTO collisions FROM (
		SELECT 1 FROM "account" GROUP BY "issuer", "account_id" HAVING count(*) > 1
	) AS duplicates;

	IF collisions > 0 THEN
		RAISE EXCEPTION
			'account issuer backfill produced % duplicate (issuer, account_id) pair(s); resolve them before retrying. Inspect with: SELECT issuer, account_id, count(*) FROM account GROUP BY 1, 2 HAVING count(*) > 1;',
			collisions;
	END IF;
END $$;--> statement-breakpoint

ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;--> statement-breakpoint

CREATE UNIQUE INDEX "account_issuer_account_id_unique_idx" ON "account" ("issuer","account_id");
