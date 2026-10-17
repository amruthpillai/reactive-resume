# SVc: Guard resume saves and expose authenticated account operations

Status: succeeded on `mobile/SVc`. SV3 was committed as `051b3f328`; SV5 is complete after the owner explicitly approved extending ownership to `packages/auth/src/config.ts`.

## SV3

- `resume.update` accepts optional `expectedUpdatedAt`, coerced to a Date just like `resume.patch`.
- Both operations use the same `assertResumeVersion` guard and existing `resumeVersionConflict` error constructor. A stale save returns `RESUME_VERSION_CONFLICT`, HTTP 409, with the current ISO timestamp in `data.updatedAt`.
- The guard runs under the existing `SELECT ... FOR UPDATE` lock, after ownership/lock checks and before slug redirects, embedded-letter adoption, persistence, history, or notifications. Comparison uses JavaScript millisecond precision, preserving the existing patch protection against PostgreSQL microsecond timestamps.
- Matching timestamps save normally. Omitting the timestamp preserves existing callers, including web autosave, MCP updates, and history restore. Cover letters are unchanged.
- Public contract changes are confined to the resume DTO and procedure. The coordinator should regenerate OpenAPI once after merging; `docs/spec.json` was not changed.

## Regression authoring gate

One table-driven regression was added to the existing service test harness.

1. Contract: a stale full save cannot overwrite newer data; its 409 carries the current timestamp. Matching and omitted timestamps remain accepted.
2. Credible failure: `resume.update` ignores the new timestamp or compares it incorrectly.
3. Existing coverage checks slug validation, locks, restore, and patch validation, but does not guard full-save version conflicts.
4. No production test seam was added. The test uses the existing transaction mock at the service boundary.

Before implementation, the stale case failed because the save resolved successfully. The matching and omitted controls passed. After implementation, all 24 service tests pass.

## SV5: Account wrappers

- Added protected `auth.updateProfile` (`PATCH /auth/profile`), `auth.apiKeys.list` (`GET /auth/api-keys`), and `auth.apiKeys.delete` (`DELETE /auth/api-keys/{keyId}`). They inherit the shared cookie, bearer, and API-key authentication and read/write/delete permission checks.
- Profile input accepts optional `name`, `username`, and nullable `image`. Name and username validation match web settings; username changes also update `displayUsername`. The actual Better Auth username hook enforces normalization and uniqueness, including accepting the account's own username. Output is `{ status: boolean }`.
- List output is `{ apiKeys, total }`. Each key exposes only `id`, `name`, `start`, `prefix`, `enabled`, `createdAt`, `updatedAt`, `expiresAt`, `lastRequest`, and parsed `permissions`. Secrets, arbitrary metadata, and ownership/storage internals are excluded by the output schema.
- Delete accepts `{ keyId }`, returns `{ success: boolean }`, and delegates ownership enforcement to Better Auth's API-key endpoint. Foreign keys return 404.
- Better Auth client errors retain their status and machine-readable code at the oRPC boundary, including `USERNAME_IS_ALREADY_TAKEN` (400).
- `createApiKey` and `deleteAccount` remain browser-only, with their original handlers unchanged.

### Approved auth bridge

Installed Better Auth and API-key plugin versions are **1.7.7**. Their actual source requires a browser session for all three APIs:

- `better-auth/dist/api/routes/update-user.mjs`: `updateUser` uses `sessionMiddleware`, updates `ctx.context.session.user.id`, and sets a session cookie. It has no server-side `userId` override.
- `@better-auth/api-key/dist/index.mjs`: `listApiKeys` and `deleteApiKey` both use `sessionMiddleware`. List derives `referenceId` from the session; delete checks the key's owner against the session user. Neither accepts a server-side `userId` override.
- `better-auth/dist/api/to-auth-endpoints.mjs`: `auth.api.*` replaces a supplied `context` with its initialized auth context. Passing a synthetic session in the call does not bridge OAuth/API-key authentication.
- The username plugin's before hook for `/update-user` validates/normalizes the username and rejects an existing username unless its user matches the session user. Reusing that endpoint is necessary to retain today's settings behavior; `adminUpdateUser` requires admin privileges and does not replace this path.
- `packages/auth/src/config.ts` deliberately has `enableSessionForAPIKeys: false`. Forwarding bearer/API-key headers therefore does not supply the session these endpoints require, as S3 also demonstrated.

Forwarding raw incoming cookies would also be incorrect: a request can carry an API key or bearer token for one user and a browser cookie for another. The wrappers bind Better Auth calls to `protectedProcedure`'s authenticated user instead.

The exported `accountAuth` object in `@reactive-resume/auth/config` provides exactly three internal operations: `updateProfile(user, body)`, `listApiKeys(user)`, and `deleteApiKey(user, keyId)`. Each calls the corresponding `auth.api.*` endpoint inside private `AsyncLocalStorage` holding the resolved current user. No incoming headers or user-supplied user IDs are forwarded.

The existing before hook supplies that identity only for direct server calls to `/update-user`, `/api-key/list`, and `/api-key/delete`; HTTP requests and all other endpoints are excluded. The ephemeral session-shaped context has an empty token/ID and expired timestamps, is never persisted, and is request-local. Better Auth's internal profile response cookie headers are discarded; oRPC never emits them. The shared Better Auth context is not mutated.

The earlier ownership question is resolved by the owner's explicit "allowed" reply. No changes were made to the SVa social-provider block or SVb token validation.

### Focused security regression

The one added account test guards silent cross-account access through this new identity bridge. Existing credential-creation and account-deletion tests did not cover it, and no test-only production seam was added: it uses the existing `withDatabasePool` helper and a real, isolated PostgreSQL schema cloned from the migrated OAuth test database.

It executes concurrent profile/list/delete calls for the three authenticated methods while carrying another user's valid browser cookie. It checks persisted user identities, username collision rejection, key ownership, secret-free output, no outgoing session cookies or extra stored sessions, and that raw unauthenticated Better Auth calls/HTTP requests remain unauthorized afterward. Authentication is supplied through the existing server-resolved procedure context; this is not an on-device OAuth sign-in test. The test initially caught an incorrectly nested Better Auth hook context (401); the corrected request-local hook passes.

## Validation

- `pnpm install --frozen-lockfile`: passed; no manifest or lockfile changes. Worktree initially had no dependencies.
- Pre-fix focused regression: failed as intended (stale save resolved); matching/omitted controls passed.
- `pnpm --filter @reactive-resume/api test src/features/resume/service.test.ts`: passed, 24 tests.
- Created disposable local database `sv_c_20261017` on the existing development PostgreSQL container and applied the repository migrations. No application database was used for test mutations. Dropped the disposable database after completing all tests.
- `pnpm --filter @reactive-resume/api test src/features/auth/account.integration.test.ts` with `OAUTH_TEST_DATABASE_URL` pointing to that database: passed against actual Better Auth APIs and PostgreSQL.
- `pnpm --filter @reactive-resume/auth --filter @reactive-resume/api test` with `DATABASE_URL`, `OAUTH_TEST_DATABASE_URL`, and `COVER_LETTER_TEST_DATABASE_URL` pointing to the disposable database: auth 7 files / 32 tests passed; API 62 files / 457 tests passed, with 4 integration tests skipped until their separate `INTEGRATIONS_TEST_DATABASE_URL` gate was supplied. Existing pg client query-concurrency deprecation warning did not fail the suites.
- `pnpm --filter @reactive-resume/api test src/features/web-access/credentials.integration.test.ts` with `INTEGRATIONS_TEST_DATABASE_URL` pointing to the disposable database: passed, all remaining 4 tests. Across both runs, all 461 API tests passed; auth adds 32 passing tests.
- `pnpm --filter @reactive-resume/auth --filter @reactive-resume/api --filter web --filter server --filter @reactive-resume/mcp typecheck`: passed for both touched packages and their consumers.
- `pnpm exec oxlint --fix <changed TS paths>` followed by `pnpm exec oxfmt <changed TS paths>`: passed.
- `pnpm exec oxlint --deny-warnings <changed TS paths>`: passed.
- `pnpm exec oxfmt --check <changed TS paths>`: passed.
- `pnpm exec turbo boundaries`: passed, 1,173 files / 22 packages.
- `pnpm lint:agent`: passed.
- `pnpm format:check`: passed, 1,560 files. The report path is excluded by formatter configuration; explicitly targeting it also reports no matching files.
- `pnpm build`: passed, all three build tasks (server, web, DSH plugin), including localized marketing prerender. Vite reported an ineffective dynamic import in the existing ATS PDF graph and plugin timing advice; neither failed the build.
- **Review fix:** Added explicit `OAUTH_TEST_DATABASE_URL` entries to the API `test`, `test:ci`, and `test:coverage` env arrays, under the coordinator's approved ownership extension. `.github/workflows/e2e.yml` already supplies this variable to the unit-test job and migrates its separate OAuth database first. Ran `pnpm exec turbo run test:ci --filter=@reactive-resume/api --env-mode=strict -- src/features/auth/account.integration.test.ts` against a disposable migrated local database: 1 passed, 0 skipped, confirmed in Vitest JSON. The baseline also executed successfully via inherited root `OAUTH_*`; the requested explicit declarations now document the package-level dependency. Lint, formatting, and boundaries passed; no source changed, so typechecks and production build were not repeated. Removed the disposable database afterward.

No push, PR, dependency addition, or generated OpenAPI update. Ownership extensions cover the approved auth configuration bridge and the reviewed API Turbo environment declarations. Coordinator regenerates OpenAPI after merging.

Remaining limits: on-device OAuth flow and real-database concurrent resume saves were not exercised in this task. Account isolation was exercised concurrently against PostgreSQL. The bridge depends on Better Auth 1.7.7's before-hook/session contract, covered by the opt-in real-database regression; CI already migrates and supplies `OAUTH_TEST_DATABASE_URL`.
