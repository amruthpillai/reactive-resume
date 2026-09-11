# 03 — Verify MCP registration after the OAuth persistence fix

**Planned at:** `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec` (2026-09-05). **Status:** historical confirmed defect fixed; remaining deployment/client evidence needed.  
**Priority:** P1 verification. **Effort:** 0.5–1 day local verification; operator retest dependent. **Risk:** High: OAuth security and schema evolution.  
**Issues:** [#3398](https://github.com/amruthpillai/reactive-resume/issues/3398), [#3153](https://github.com/amruthpillai/reactive-resume/issues/3153).

## Execution contract

This document records a planning-only audit. A future operator request to execute this plan authorizes ordinary repository implementation, verification, commits and PR work within its approved scope; do not ask again for those routine actions. Explicit product decisions and private/production data access remain gates only where named below. Never merge. Use a fresh `codex/` worktree from current `origin/main`, read actual `AGENTS.md`, check `rtk proxy git status --short`, and run intent skill discovery before edits. Use CodeGraph first only when that worktree has `.codegraph/`. Do not reset or overwrite another worker's files. The coordinator owns the plan index; report status rather than editing another worker's index.

Run this exact drift command first:

```bash
rtk proxy git diff --stat 7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec..HEAD -- 'packages/db/src/schema/auth.ts' 'migrations/20260905113135_oauth_provider_schema/migration.sql' 'apps/server/src/startup/checks.ts' 'apps/server/src/index.ts' 'packages/auth/src/config.ts' 'apps/server/src/http/auth.ts' 'packages/auth/src/oauth-schema.test.ts' 'apps/server/src/http/oauth-flow.integration.test.ts'
```

Expected: no in-scope source changes since the planned base. If output appears, re-read those symbols and compare the excerpts before continuing; stop and report if the diagnosis or approved scope no longer applies. Run shell commands through `rtk` or `rtk proxy`.

Use Node.js 24 and the pnpm version declared in `package.json`; workspace packages consume source through export maps. New browser behavior belongs in `apps/web`, HTTP adapters in `apps/server`, business logic in `packages/api`, auth in `packages/auth`, and database shape in `packages/db`. Never import another package's source by relative path. Preserve existing defaults unless this plan explicitly approves a change. Do not publish credentials, cookies, reset links, private resumes, email addresses, or raw provider logs. Record sanitized status codes, request shape, and credential type only.

## Problem and issue-specific evidence

| Issue | Evidence reviewed | Acceptance and closure |
| --- | --- | --- |
| #3398 | Cloud 5.2.9, Codex CLI 0.151, macOS 26.6: dynamic client registration returns HTTP 500 before browser login or consent. PR #3421 fixed a reproduced local mismatch between Better Auth's OAuth plugin fields and database schema. No production database trace proves the same cause was deployed. | Registration succeeds on the affected deployment and exact client, then login → explicit consent → PKCE exchange reaches MCP. Establish deployed migration/digest before closing the historical failure. |
| #3153 | Claude web custom connector rejects dynamic registration before consent. No response status/body or redirect URI supplied. This could be redirect policy, schema, or client configuration. | Capture the current sanitized failure. An allowed client reaches consent; a prohibited redirect gets a controlled rejection. Do not call policy rejection a schema bug or close based solely on Codex success. |

Grouping is justified for shared DCR and OAuth integration tests. A shared residual root cause is **not** proved. Current code permits unauthenticated dynamic registration but validates redirect URIs, infers native application type only for exact HTTP loopback, and defaults unauthenticated public clients to token authentication `none`. Current startup runs migrations before importing auth-dependent application code. Preserve all these protections.

## Files and dependency order

1. `packages/db/src/schema/auth.ts`: OAuth tables and additive Better Auth 1.7 fields.
2. `migrations/20260905113135_oauth_provider_schema/migration.sql`: existing additive migration; do not add a duplicate migration to fix an old deployment.
3. `apps/server/src/startup/checks.ts` and `apps/server/src/index.ts`: migrations before auth resource seeding.
4. `packages/auth/src/config.ts`: `getAuthConfig`, DCR hook, OAuth plugin options.
5. `apps/server/src/http/auth.ts`: `defaultPublicClientRegistration`, `handleAuth`, OAuth continuation.
6. `packages/auth/src/oauth-schema.test.ts`, `apps/server/src/http/auth.test.ts`, `apps/server/src/http/oauth-flow.integration.test.ts`: schema, request shaping, real DB protocol regression seams.

The PostgreSQL integration fixture is already in repo. It uses `OAUTH_TEST_DATABASE_URL`, creates controlled accounts/clients, and intentionally skips without an explicitly supplied disposable database. Do not point it at an operator database.

## Verification and conditional repair steps

1. Ask the operator for image digest, migration completion timestamp and sanitized first registration error. Inspect metadata only: table/column names and migration journal, never token/client-secret row values. Classify 500 schema error separately from a 400 redirect/resource error. Verification: failing response links to one server event by timestamp.
2. Rerun the schema contract test against the installed OAuth plugin; it checks every plugin field against Drizzle exports. If green, do not delete it or manually hardcode fewer fields. Verification command: `rtk proxy pnpm --filter @reactive-resume/auth exec vitest run src/oauth-schema.test.ts` (part of 21 passing auth tests in this audit).
3. Provision a new disposable database with the current migrations through the normal startup path. Use an operator-created, git-ignored environment file containing only synthetic test credentials and a new DB name. Launch migrations through `rtk proxy dotenvx run -f .env.oauth-test.local -- pnpm db:migrate`; this command is destructive to the selected schema and may run only after confirming it is disposable. The file must contain `DATABASE_URL` and matching `OAUTH_TEST_DATABASE_URL`. Then execute `rtk proxy dotenvx run -f .env.oauth-test.local -- pnpm --filter server exec vitest run src/http/oauth-flow.integration.test.ts`. Expected: four tests execute and pass, zero skips. This DB-backed command was **not** executed in the planning pass; server baseline skipped these four tests.
4. Reuse the in-repo fixture's loopback redirect, public registration, S256 challenge and resource audience. Add a sanitized failing client payload as a table case only after receiving it. Check no authorization code appears before explicit consent; deny consent, tamper signature/scope, use untrusted origin/resource, replay the code. Verification: legitimate path succeeds; all adversarial branches fail without granting tokens.
5. Branch on outcome: missing deployed columns → correct the release/migration rollout and verify the existing migration; changed installed-plugin contract → additive schema/migration fix with populated upgrade fixture; rejected URI → document exact supported URI or seek a separate security-reviewed policy decision; malformed client payload → narrow adapter normalization without weakening validation. Do not set the unsafe redirect flag globally or skip consent. Verification: old failing fixture red, selected fix green, old valid clients remain green.
6. Operator retests exact Codex and Claude versions on the deployed head and records sanitized status, phase and UTC time. If one client still fails, retain that issue independently. Do not rerun live registration repeatedly as an unattended probe or publish client secrets.

## Commands and expected results

Executed baseline: auth 21 passed; server 105 passed, 4 integration tests skipped; auth/API/DB/server typechecks passed; boundaries checked 1079 files in 20 packages with no violations.

```bash
rtk proxy pnpm --filter @reactive-resume/auth test
rtk proxy pnpm --filter server test
rtk proxy pnpm --filter @reactive-resume/auth --filter @reactive-resume/db --filter server typecheck
rtk proxy pnpm exec turbo boundaries
```

For source changes, rerun schema, server adapter and explicit DB integration commands. For a migration change, test empty DB and upgrade from a populated immediately preceding schema; verify existing clients/consents/tokens survive and repeat migration is a no-op. Prefer one PR for a proven shared schema/adapter fix; retain per-client acceptance records.

## Stop conditions, default preservation, and maintenance

STOP if only a historical HTTP 500 is available, deployed migration state is unknown, or the requested redirect requires new trust policy. A green schema test is not a cloud deployment check. Never drop OAuth tables, reset migration journals, broaden allowed origins, change token lifetimes, disable PKCE/consent, or rotate operator secrets as part of this issue. Update the plugin-schema contract test on dependency upgrades and keep startup ordering covered. Completion requires an independently verified current client result or an explicit bounded-negative record; no issue closure solely from pipeline inspection.

## Exact current source anchors

Line numbers are from the planned source base. These are evidence, not replacement snippets.

`apps/server/src/index.ts:6`:

```ts
export async function main() {
	await runStartupChecks();

	// OAuth resource seeding starts when auth is imported, so load the app only
	// after migrations have created the provider tables.
	const { createApp } = await import("./http/app");
```

`packages/auth/src/config.ts:305`:

```ts
			oauthProvider({
				loginPage: "/api/auth/oauth",
				consentPage: "/auth/consent",
				resources: OAUTH_AUDIENCES,
				clientRegistrationDefaultResources: OAUTH_AUDIENCES,
				allowDynamicClientRegistration: true,
				// Required for MCP client onboarding (RFC 7591). Redirect URI validation
				// and explicit user consent protect access by dynamically registered clients.
				allowUnauthenticatedClientRegistration: true,
				rateLimit: oauthProviderRateLimit,
				silenceWarnings: { oauthAuthServerConfig: true },
```

`apps/server/src/http/auth.ts:75`:

```ts
	// MCP native clients often omit OIDC application_type. Infer it only for
	// exact HTTP loopback callbacks; the provider still validates every URI.
	if (body.application_type === undefined && Array.isArray(body.redirect_uris) && body.redirect_uris.length > 0) {
		const allLoopback = body.redirect_uris.every(
			(uri: unknown) =>
				typeof uri === "string" && /^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]+)?(?:[/?]|$)/i.test(uri),
		);
		if (allLoopback) body.application_type = "native";
	}

	if (!request.headers.get("authorization")) {
		body.token_endpoint_auth_method = "none";
```

`packages/auth/src/oauth-schema.test.ts:8`:

```ts
describe("OAuth provider persistence schema", () => {
	it.each(Object.entries(plugin.schema))("provides every installed plugin field for %s", (modelName, model) => {
		const table = Reflect.get(dbSchema, modelName);
		expect(is(table, Table), `Missing table ${modelName}`).toBe(true);
		if (!is(table, Table)) return;
		const columns = getTableColumns(table);
		for (const field of Object.keys(model.fields)) {
			expect(columns, `${modelName}.${field}`).toHaveProperty(field);
		}
```

