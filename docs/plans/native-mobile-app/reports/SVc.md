# SVc: Guard resume saves; investigate account wrappers

Status: blocked on SV5 ownership. SV3 is implemented and validated on `mobile/SVc`.

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

## SV5 blocker: Better Auth session contract

Installed Better Auth and API-key plugin versions are **1.7.7**. Their actual source requires a browser session for all three APIs:

- `better-auth/dist/api/routes/update-user.mjs`: `updateUser` uses `sessionMiddleware`, updates `ctx.context.session.user.id`, and sets a session cookie. It has no server-side `userId` override.
- `@better-auth/api-key/dist/index.mjs`: `listApiKeys` and `deleteApiKey` both use `sessionMiddleware`. List derives `referenceId` from the session; delete checks the key's owner against the session user. Neither accepts a server-side `userId` override.
- `better-auth/dist/api/to-auth-endpoints.mjs`: `auth.api.*` replaces a supplied `context` with its initialized auth context. Passing a synthetic session in the call does not bridge OAuth/API-key authentication.
- The username plugin's before hook for `/update-user` validates/normalizes the username and rejects an existing username unless its user matches the session user. Reusing that endpoint is necessary to retain today's settings behavior; `adminUpdateUser` requires admin privileges and does not replace this path.
- `packages/auth/src/config.ts` deliberately has `enableSessionForAPIKeys: false`. Forwarding bearer/API-key headers therefore does not supply the session these endpoints require, as S3 also demonstrated.

Forwarding raw incoming cookies would also be incorrect: a request can carry an API key or bearer token for one user and a browser cookie for another. The wrappers must bind Better Auth calls to `protectedProcedure`'s authenticated user, rather than let Better Auth pick a different cookie identity.

No SV5 wrapper has been added. A wrapper that merely forwards headers would compile but fail bearer calls; manufacturing browser sessions or mutating the shared auth context would introduce unapproved credential/lifecycle behavior.

### QUESTION

May SVc's ownership be extended narrowly to `packages/auth/src/config.ts` to add a request-local, server-only authenticated-user bridge for these three Better Auth APIs, preserving the existing username hooks and API-key ownership checks? Alternatively, the coordinator can supply that bridge as a prior-wave contract. Browser-only `createApiKey` and `deleteAccount` must remain unchanged.

This question is required by README §3.4 rule 3: stop when a contract is missing or implementation needs edits outside Ownership. SVc currently owns only API resume/auth/DTO paths and this report; the auth configuration belongs outside that scope.

## Validation

- `pnpm install --frozen-lockfile`: passed; no manifest or lockfile changes. Worktree initially had no dependencies.
- Pre-fix focused regression: failed as intended (stale save resolved); matching/omitted controls passed.
- `pnpm --filter @reactive-resume/api test src/features/resume/service.test.ts`: passed, 24 tests.
- `pnpm --filter @reactive-resume/api test`: passed, 58 files / 392 tests; 4 files / 68 tests skipped by existing environment gates. No real test database was configured.
- `pnpm --filter @reactive-resume/api --filter web --filter server --filter @reactive-resume/mcp typecheck`: passed for all four consumers.
- `pnpm exec oxlint --fix <four changed TS paths>` followed by `pnpm exec oxfmt <four changed TS paths>`: passed.
- `pnpm exec oxlint --deny-warnings <four changed TS paths>`: passed.
- `pnpm exec oxfmt --check <four changed TS paths>`: passed.
- `pnpm exec turbo boundaries`: passed, 1,172 files / 22 packages.
- `pnpm lint:agent`: passed.
- `pnpm format:check`: passed, 1,559 files. The report path is excluded by formatter configuration; explicitly targeting it also reports no matching files.
- `pnpm build`: passed, all three build tasks (server, web, DSH plugin), including localized marketing prerender. Vite reported an ineffective dynamic import in the existing ATS PDF graph and plugin timing advice; neither failed the build.

No push, PR, dependency addition, generated OpenAPI update, or edit outside Ownership.

Remaining risk: real-database concurrency was not exercised. SV5 is unimplemented until the coordinator resolves the auth bridge ownership/contract.
