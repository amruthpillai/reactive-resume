# SVb: Let offline_access grants outlive the browser session

STATUS: succeeded

## Result

`verifyOAuthToken` skips browser-session validation only when the signed token's scopes include `offline_access`.
Every other token retains the existing `payload.sid !== undefined` behavior, including rejection of null or
non-string session IDs and of missing or expired sessions. Client checks, JWT verification and consent checks
remain unchanged. No authorization decision uses `application_type`.

Already-issued JWT access tokens remain valid for up to 1 hour after refresh-token revocation or in-app sign-out.
Consent revocation in Connected applications blocks them immediately because every token still passes the
consent check. This limit is documented beside the session check and in the MCP guide, whose previous text
incorrectly described ended sessions as invalidating every signed token under the new behavior.

## Ownership and contracts

- `packages/auth/src/config.ts`: only `verifyOAuthToken` changed.
- `packages/auth/src/oauth-token.test.ts`: one paired regression test, using the existing signed-token fixture pattern.
- `docs/guides/using-the-mcp-server.mdx`: correct the old session-lifetime description.
- `docs/plans/native-mobile-app/reports/SVb.md`: this report.

No new shared surfaces, dependencies, environment variables or generated specifications. No changes to
SVa/SVc ownership, the ledger, manifests or lockfile. No push.

## Regression gate

The test protects the signed-token authorization boundary: an expired-session lookup rejects a token without
`offline_access`, while the same lookup must not invalidate an `offline_access` token with current consent.
Existing coverage rejected ended sessions but did not exercise the offline grant exception. Database lookups
are mocked, following the neighboring tests; JWT signing and verification are real. No production test seam
was added.

Before the fix, `pnpm --filter @reactive-resume/auth test src/oauth-token.test.ts` failed only the new test:
the offline token rejected with `OAuth session has ended.` instead of resolving. After the fix, the complete
auth suite passed, including that regression.

## Validation

Commands ran through `rtk` or `rtk proxy`.

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed; lockfile unchanged. |
| `pnpm --filter @reactive-resume/auth test` | Passed: 33 tests across 7 files. |
| `pnpm --filter @reactive-resume/auth typecheck` | Passed using `rtk proxy`; runs `tsgo --noEmit`. |
| `pnpm exec oxlint --fix packages/auth/src/config.ts packages/auth/src/oauth-token.test.ts` | Passed. |
| `pnpm exec oxfmt packages/auth/src/config.ts packages/auth/src/oauth-token.test.ts docs/guides/using-the-mcp-server.mdx` | Passed. |
| `pnpm exec oxlint --deny-warnings packages/auth/src/config.ts packages/auth/src/oauth-token.test.ts` | Passed. |
| `pnpm exec oxfmt --check packages/auth/src/config.ts packages/auth/src/oauth-token.test.ts docs/guides/using-the-mcp-server.mdx` | Passed. |
| `pnpm lint:agent` | Passed. |
| `pnpm format:check` | Passed. |
| `pnpm exec turbo boundaries` | Passed: 1172 files, 22 packages. |
| `pnpm --filter server build` | Passed; production server bundle built. |
| `git diff --check` | Passed. |

The first typecheck invocation through `rtk pnpm` was incorrectly rewritten to root TypeScript compilation,
which failed with TS5096 and emitted JavaScript files. All 1177 newly generated untracked files were removed
after verifying each had a corresponding TypeScript source. The exact package typecheck was then rerun through
`rtk proxy`, followed by another successful full auth test run. No generated JavaScript remains in the diff.
The report directory is excluded by `.oxfmtrc.json`; a direct formatter invocation on this report returned
"Expected at least one target file." Source and guide formatting checks passed.

## Follow-ups and limits

No implementation follow-ups or open questions. Real-database OAuth integration, browser/device flows and the
full web build were not run; the auth unit suite intentionally mocks database lookups. The coordinator still
owns the combined OpenAPI regeneration and cross-harness review.
