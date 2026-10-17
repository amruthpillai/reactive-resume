# SV: Server changes for the native app (three parallel tasks)

Base: `mobile/native-app`. Harness: Codex. Reviewer: Claude Code.
Questions: end your turn with a `QUESTION:` block and `STATUS: blocked` (README §3.4). Follow §3.4 rule 5: never end your turn while you wait on a background process or a subagent.

## Read first

- `AGENTS.md`: especially "New env var", Security and Linting.
- `docs/plans/native-mobile-app/README.md` §0, §1.6 (SV1–SV6, including the owner decisions recorded there), §3.4–§3.7 and §6.
- `docs/plans/native-mobile-app/ledger.md`: the S3 carry-forward and the S3 review notes.
- `docs/plans/native-mobile-app/reports/S3.md` on branch `mobile/S3` (`git show mobile/S3:docs/plans/native-mobile-app/reports/S3.md`): §3–§5.

## Shared rules

- **Tests:** follow the test-audit authoring gate. Add at most one focused test per behaviour change, only where a regression would be silent (SV3 conflict, SV4 token check), and copy the patterns from neighbouring tests. Run the existing tests of every package you touch: `pnpm --filter <pkg> test`. Suites that need a real database use the env vars in AGENTS.md. If the database is unavailable, say so; do not fake it.
- **Generated files:** do not run `pnpm docs:gen` and do not commit `docs/spec.json`. The coordinator regenerates it once after merging.
- **Before finishing:** `pnpm --filter <touched pkgs> typecheck`, `pnpm exec oxlint --deny-warnings <changed paths>`, `pnpm exec oxfmt --check <changed paths>`, `pnpm exec turbo boundaries`.
- **Commits:** lowercase conventional commits, for example `feat(auth): …`. No push. No AI attribution. Write `docs/plans/native-mobile-app/reports/<task>.md`, then end with the report block from README §3.5.

## SVa: SV1 + SV2 (app links, native callback, Sign in with Apple)

Branch: `mobile/SVa`.

**Ownership:**

- `apps/server/src/http/**`
- `apps/web/src/routes/auth/**`
- `apps/web/src/features/auth/**`
- `packages/env/src/{server,deployment}.ts`
- `.env.example`
- `turbo.json` (the `globalPassThroughEnv` and test env arrays only)
- `packages/auth/src/config.ts` (`socialProviders` block only)
- `packages/api/src/features/auth/**` (`providers.list` only)
- `apps/web/locales/en-US.po` (only through `pnpm lingui:extract`)
- `docs/self-hosting/**` (a short env var note)
- `reports/SVa.md`

**SV1:**

1. Serve `GET /.well-known/apple-app-site-association` (`Content-Type: application/json`, no redirect, no extension). It carries `applinks` and `webcredentials` for the app IDs in `MOBILE_IOS_APP_IDS` (comma-separated `TEAMID.bundle.id`). Paths: `/auth/native-callback` plus `/{username}/{slug}` and `/builder/*` for deep links (README §4 M7-T3).
2. Serve `GET /.well-known/assetlinks.json` from `MOBILE_ANDROID_PACKAGES` and `MOBILE_ANDROID_CERT_SHA256` (both comma-separated).
3. When the env is unset, return 404, so self-hosters are unaffected.
4. Add a web route `/auth/native-callback`: a fallback page saying "Open the Reactive Resume app" with a retry link. It must **never log or render the `code` query value**. Add it to the server's HTML/SEO fallback if public routes need that (AGENTS.md, "Web app conventions").
5. Register the new env vars as AGENTS.md "New env var" says.

**SV2:**

1. Add Apple as an env-gated Better Auth social provider (`APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`, plus any extra fields Better Auth 1.7.7's Apple provider needs; read its source in node_modules).
2. Show the button in `social-auth.tsx` and in `auth.providers.list` the same way as Google/GitHub.
3. Better Auth's Apple flow uses a POST callback (form_post). Make sure the existing origin/CSRF config accepts it, and set Apple's trusted origin if Better Auth requires one.

## SVb: SV4 (`offline_access` grants outlive the browser session)

Branch: `mobile/SVb`.

**Ownership:**

- `packages/auth/src/config.ts` (`verifyOAuthToken` only)
- its tests
- `docs/` pages that describe connected apps or MCP token lifetime, only if they state the old behaviour
- `reports/SVb.md`

**Change:** follow README §1.6 SV4 exactly, including the three review corrections:

1. Skip the browser-session (`sid`) check **only** when the token's scopes include `offline_access`. Keep today's validation, including the `sid !== undefined` semantics, for every other token.
2. Keep the consent check for all tokens.
3. Do not branch on `application_type`.
4. Document in a code comment and in the report that JWT access tokens stay valid for up to 1 h after refresh revocation or in-app sign-out, while consent revocation blocks them immediately.

Add one test covering two cases: an `offline_access` token whose `sid` session is expired is accepted, and a non-`offline_access` token in that situation is rejected.

## SVc: SV3 + SV5 (resume save conflict check, account wrappers)

Branch: `mobile/SVc`.

**Ownership:**

- `packages/api/src/features/resume/**`
- `packages/api/src/features/auth/**`
- `packages/api/src/dto/**`
- `reports/SVc.md`

**SV3:**

1. Give `resume.update` an optional `expectedUpdatedAt`. On a mismatch, return the same 409 `RESUME_VERSION_CONFLICT` with `data.updatedAt` that `resume.patch` returns (`features/resume/service.ts`, about lines 82–97). Reuse that code path; do not duplicate it.
2. Omitting it keeps today's behaviour, so the web app is unaffected.
3. Cover letters already have `expectedRevision`, so no change there.

**SV5:**

1. Add oRPC `auth.updateProfile` (name, username, image) and `auth.apiKeys.list` / `auth.apiKeys.delete`, as `protectedProcedure`s that work with bearer, cookie and API-key auth.
2. Each calls `auth.api.*` server-side for the current user only.
3. Keep `createApiKey` and `deleteAccount` browser-only; they are unchanged (owner decision).
4. Validate username uniqueness the same way the web settings page does today. Find out how; Better Auth's username plugin may enforce it.
5. List never returns key secrets.
