# 05 — Diagnose missing AI provider schema on self-hosted deployments

**Planned at:** `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec` (2026-09-05). **Status:** needs_reproduction; database absence observed historically, migration defect unproved.  
**Priority:** P1 deployment investigation. **Effort:** 0.5–1 day with deployment metadata; 1–2 days if migration repair proved. **Risk:** High: database integrity and stored credentials.  
**Issues:** [#3152](https://github.com/amruthpillai/reactive-resume/issues/3152).

## Execution contract

This document records a planning-only audit. A future operator request to execute this plan authorizes ordinary repository implementation, verification, commits and PR work within its approved scope; do not ask again for those routine actions. Explicit product decisions and private/production data access remain gates only where named below. Never merge. Use a fresh `codex/` worktree from current `origin/main`, read actual `AGENTS.md`, check `rtk proxy git status --short`, and run intent skill discovery before edits. Use CodeGraph first only when that worktree has `.codegraph/`. Do not reset or overwrite another worker's files. The coordinator owns the plan index; report status rather than editing another worker's index.

Run this exact drift command first:

```bash
rtk proxy git diff --stat 7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec..HEAD -- 'packages/db/src/schema/agent.ts' 'migrations/20260513181752_bent_human_cannonball/migration.sql' 'apps/server/src/startup/checks.ts' 'apps/server/src/index.ts' 'Dockerfile' 'packages/api/src/features/ai-providers/service.ts' 'packages/db/drizzle.config.ts'
```

Expected: no in-scope source changes since the planned base. If output appears, re-read those symbols and compare the excerpts before continuing; stop and report if the diagnosis or approved scope no longer applies. Run shell commands through `rtk` or `rtk proxy`.

Use Node.js 24 and the pnpm version declared in `package.json`; workspace packages consume source through export maps. New browser behavior belongs in `apps/web`, HTTP adapters in `apps/server`, business logic in `packages/api`, auth in `packages/auth`, and database shape in `packages/db`. Never import another package's source by relative path. Preserve existing defaults unless this plan explicitly approves a change. Do not publish credentials, cookies, reset links, private resumes, email addresses, or raw provider logs. Record sanitized status codes, request shape, and credential type only.

## Symptom, evidence, and claim boundary

Issue #3152 reports PostgreSQL `42P01`, `relation "ai_providers" does not exist`, after enabling Redis and credential encryption on a Kubernetes/ArgoCD v5.1.4 deployment. This is concrete evidence that the failing query could not resolve that relation in that connection's schema. It does not identify why migration was absent or invisible. Redis and encryption configuration expose the saved-provider workflow; they do not themselves create the PostgreSQL table.

Current source defines `aiProvider`, creates it in `migrations/20260513181752_bent_human_cannonball/migration.sql`, packages migrations in the image, and awaits migration before serving. Earlier audit evidence reports six successful disposable PostgreSQL migration checkpoints: fresh exact v5.1.4, upgrade into v5.1.4, current upgrade, repeat migration, current fresh schema, and successful issue-shaped SELECT. This planning pass independently read the current schema/migration/startup/Docker path and verified DB/server types; it did not rerun those historical containers. Treat the prior result as bounded negative evidence, not as a later release fixing the reporter. The repeatable protocol below replaces any dependency on temporary audit files.

Acceptance: a deployment matching the reporter's topology applies its packaged migrations to the same database/schema used by requests; `ai_providers` resolves, provider list is empty on fresh data, and synthetic provider create/test/update works. Closure additionally requires affected deployment digest and operator-confirmed success or an established configuration cause. A green clean database alone cannot close this issue.

## Owners, prerequisites, and invariants

Owning files: `packages/db/src/schema/agent.ts` (`aiProvider`), the existing May migration above, `apps/server/src/startup/checks.ts` (`resolveWorkspaceFolder`, `runDatabaseMigrations`), `apps/server/src/index.ts` (`main`), `Dockerfile` migration copy, and `packages/api/src/features/ai-providers/service.ts` (`list`, provider persistence). Database CLI configuration is `packages/db/drizzle.config.ts`; env loader is `packages/env/src/server.ts`. Keep new schema fields in DB and new env variables in env validation plus `turbo.json` globalEnv.

An operator must supply a disposable PostgreSQL instance, image digest and sanitized startup/migration metadata. No account data or credential columns are needed. Do not query encrypted provider keys or rotate `ENCRYPTION_SECRET`; its type/location may be recorded without its value. Never run reset scripts, drop schemas, or delete a migration journal on an affected instance. Back up and test restore before any later production migration proposal.

## Portable reproduction protocol

1. Record affected pod image digest, working directory, mounted migration directory existence, startup exit status, database name/schema and search path, and migration journal metadata. Use a read-only operator session for the following SQL; do not print connection strings or rows from application tables:

   ```sql
   SELECT current_database(), current_schema(), current_setting('search_path');
   SELECT to_regclass('ai_providers'), to_regclass('public.ai_providers');
   SELECT table_schema, column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'ai_providers'
   ORDER BY table_schema, ordinal_position;
   SELECT to_regclass('drizzle.__drizzle_migrations');
   ```

   Verification: establish whether the table is absent, in another schema, or present but a different process uses another database. Do not assume `public` is intended until current deployment settings confirm it.
2. Reproduce a **fresh** current database using normal migration execution, then start the built server. Use a git-ignored `.env.migration-test.local` containing synthetic APP_URL/AUTH_SECRET and only the disposable DATABASE_URL. Command: `rtk proxy dotenvx run -f .env.migration-test.local -- pnpm db:migrate`. Check `information_schema.columns` against the current Drizzle table, then rerun migration; expected second run is a no-op. This command is a future verification recipe, not a command run during planning.
3. Reproduce an **upgrade** in a separate disposable database. Read the exact v5.1.4 tag's migration directory, package manager and migration runner before executing historical code in an isolated worktree. Apply the immediately preceding migration prefix, insert only synthetic user/provider-compatible fixture records after their tables exist, then apply the remaining v5.1.4 migrations with its pinned Drizzle version. Upgrade with current packaged migrations. Compare table/column metadata and synthetic record counts at each checkpoint. Verification: issue-shaped select uses explicit non-secret fields (`id`, `provider`, `model`, `enabled`) and succeeds; data is preserved. Do not copy old scripts into current runtime.
4. Exercise startup failure deliberately on another disposable fixture: missing migrations folder, database permissions denied, or invalid target. Expect startup rejects before HTTP serving and auth initialization. Add `apps/server/src/startup/checks.test.ts` if a current startup defect is proved, with mocked pool/migrate and module loading; add a separate explicitly DB-gated integration case if ordering/persistence cannot be verified by the unit seam. Verification: failure is visible and does not serve a partially migrated app.
5. Choose the narrow repair only after the fork is known. Wrong DB/schema/search path → deployment configuration/runbook fix; missing image files → Docker packaging fix; runner skipped or import-order race → startup fix; incompatible migration → additive migration generated from the schema and tested on populated upgrade data. Never add `CREATE TABLE IF NOT EXISTS` at request time or suppress `42P01` as an empty provider list. Verification: the original failing deployment fixture turns green and deliberate startup failures remain red.
6. Validate synthetic integrations after migration: empty list, owned provider creation, encrypted credential storage through existing service, test outcome persistence, disabled provider rejection, and second user's isolation. Coordinate actual external provider tests with plan 04; migration correctness does not prove model compatibility.

## Tests and exact commands

Executed during planning: DB/API/auth/server typechecks and boundaries passed; server suite 105 passed with four unrelated DB-gated OAuth tests skipped. No Kubernetes cluster, historical image, or production database accessed.

```bash
rtk proxy pnpm --filter @reactive-resume/db --filter @reactive-resume/api --filter server typecheck
rtk proxy pnpm --filter server test
rtk proxy pnpm exec turbo boundaries
```

Future provider persistence regression pattern: `packages/api/src/features/ai-providers/service.test.ts` and `packages/api/src/features/ai-providers/e2e.test.ts`. Read the latter's opt-in DB variables and cleanup before running it; do not silently use the root environment. For a new startup unit regression: `rtk proxy pnpm --filter server exec vitest run src/startup/checks.test.ts`. For image packaging changes, run `rtk proxy pnpm build` and an isolated Docker build/start with a disposable DB, then assert migration completion precedes health success. Build/container commands are additional required verification, not claimed as executed here.

Red/green coverage: fresh schema, populated upgrade, repeated migration, search-path mismatch, denied DDL, packaged migration directory absent, failing startup never serves, and provider ownership survives upgrade. The primary regression must fail on the observed deployment fixture before the conditional fix.

## Completion, stop conditions, and maintenance

One issue, one proved repair. STOP if original image digest, startup event, database/schema identity or disposable migration environment is unavailable. Preserve fail-fast migration behavior, encryption format, provider enablement defaults, and existing user/provider rows. Require explicit operator approval for a production rollout after backup/restore verification; this plan provides no production write authorization. Update deployment docs only for the diagnosed failure and add package/startup regression coverage that will detect recurrence on future Drizzle or image-layout changes.

## Exact current source anchors

Line numbers are from the planned base; re-read after any source drift.

`packages/db/src/schema/agent.ts:17`:

```ts
export const aiProvider = pg.pgTable(
	"ai_providers",
```

`migrations/20260513181752_bent_human_cannonball/migration.sql:64`:

```sql
CREATE TABLE "ai_providers" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"label" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"base_url" text,
	"encrypted_api_key" text NOT NULL,
	"api_key_salt" text NOT NULL,
```

`apps/server/src/startup/checks.ts:27`:

```ts
async function runDatabaseMigrations() {
	console.info("Running database migrations...");

	const pool = new Pool({ connectionString: env.DATABASE_URL });
	const db = drizzle({ client: pool });

	try {
		await migrate(db, { migrationsFolder: resolveWorkspaceFolder("migrations") });
		console.info("Database migrations completed");
	} catch (error) {
		console.error("Database migrations failed", { error });
		throw error;
	} finally {
		await pool.end();
	}
}

async function validateLocalStoragePath() {
	if (env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY && env.S3_BUCKET) return;

```

`Dockerfile:64`:

```ts
COPY --from=builder --chown=node:node /app/apps/web/dist ./apps/web/dist
COPY --from=builder --chown=node:node /app/apps/server/dist ./apps/server/dist
COPY --from=pruner --chown=node:node /app/migrations ./migrations
```

