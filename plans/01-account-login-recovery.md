# 01 — Diagnose account login and recovery failures

**Planned at:** `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec` (2026-09-05). **Status:** needs_reproduction; no common current root cause proved.  
**Priority:** P1 investigation. **Effort:** 1–2 days diagnosis; 0.5–2 days per proved fix. **Risk:** High: account ownership and authentication.  
**Issues:** [#3166](https://github.com/amruthpillai/reactive-resume/issues/3166), [#3164](https://github.com/amruthpillai/reactive-resume/issues/3164), [#3078](https://github.com/amruthpillai/reactive-resume/issues/3078), [#3046](https://github.com/amruthpillai/reactive-resume/issues/3046), [#2897](https://github.com/amruthpillai/reactive-resume/issues/2897), [#2837](https://github.com/amruthpillai/reactive-resume/issues/2837).

## Execution contract

This document records a planning-only audit. A future operator request to execute this plan authorizes ordinary repository implementation, verification, commits and PR work within its approved scope; do not ask again for those routine actions. Explicit product decisions and private/production data access remain gates only where named below. Never merge. Use a fresh `codex/` worktree from current `origin/main`, read actual `AGENTS.md`, check `rtk proxy git status --short`, and run intent skill discovery before edits. Use CodeGraph first only when that worktree has `.codegraph/`. Do not reset or overwrite another worker's files. The coordinator owns the plan index; report status rather than editing another worker's index.

Run this exact drift command first:

```bash
rtk proxy git diff --stat 7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec..HEAD -- 'packages/auth/src/config.ts' 'packages/auth/src/oauth-profile.ts' 'packages/email/src/transport.ts' 'apps/web/src/features/auth/redirect.ts' 'apps/web/src/routes/auth/login.tsx' 'apps/web/src/routes/auth/reset-password.tsx' 'packages/api/src/features/resume/service.ts' 'apps/server/src/http/auth.ts'
```

Expected: no in-scope source changes since the planned base. If output appears, re-read those symbols and compare the excerpts before continuing; stop and report if the diagnosis or approved scope no longer applies. Run shell commands through `rtk` or `rtk proxy`.

Use Node.js 24 and the pnpm version declared in `package.json`; workspace packages consume source through export maps. New browser behavior belongs in `apps/web`, HTTP adapters in `apps/server`, business logic in `packages/api`, auth in `packages/auth`, and database shape in `packages/db`. Never import another package's source by relative path. Preserve existing defaults unless this plan explicitly approves a change. Do not publish credentials, cookies, reset links, private resumes, email addresses, or raw provider logs. Record sanitized status codes, request shape, and credential type only.

## Problem, evidence, and grouping

These six reports share authentication/account workflows, so one controlled account matrix and correlation method can serve all six. They do **not** establish one common defect. Full issue bodies and human comments were inspected during this audit; the public reports lack current deployment traces.

| Issue | Reported symptom and evidence limit | Acceptance and closure requirement |
| --- | --- | --- |
| #3166 | Cloud resume details remain visible but edit/download/access fail. No exact failing request, account method, or current payload supplied. This may occur after successful authentication. | Same owner can open, edit, save, reload, and export the affected resume on the deployed fix; identify the failing boundary. A successful login alone cannot close this issue. |
| #3164 | Google login fails and reset email does not arrive. A later commenter reports successful sign-up; that does not prove the original account was recovered. | Reproduce the original account's supported login method; establish reset issuance and mail delivery independently. Owner recovers existing data without creating a second account. |
| #3078 | Login appears successful then returns to login. Missing method, callback chain, browser and version. | Session persists across the callback and a full reload; authenticated dashboard does not loop; expired sessions still return to login. |
| #3046 | Google and GitHub social sign-in fail on cloud. No concrete provider error. | Both configured providers pass with existing and new controlled identities; obtain the reporter's current failing phase or explicit successful retest. |
| #2897 | Existing GitHub account returns `unable_to_create_user`. An empty flags response was observed, but no causal link established. | Existing provider subject resolves to the same local user and resumes; username collision and legacy account cases pass without linking a different identity. |
| #2837 | Recovery fails while re-registering reports email already exists. No current reset response or mail trace. | Existing identity can use its supported recovery route and retain data; unknown accounts remain indistinguishable in public recovery responses. |

Current `createProfileMapper` preserves an existing user's username and delegates account linking to Better Auth; current login redirects use the route session and sanitized callback helper. Reset mail goes through `sendEmail`; the transport deliberately logs mail without SMTP configuration and catches delivery errors. These facts identify diagnostic forks, not proof that cloud SMTP or account linking caused any report.

## Ownership and dependencies

Read `packages/auth/src/config.ts` (`getAuthConfig`, provider configuration, reset callback), `packages/auth/src/oauth-profile.ts` (`createProfileMapper`, `createGithubProfileMapper`, legacy identity lookup), `packages/email/src/transport.ts` (`getTransport`, `sendEmail`), `apps/web/src/features/auth/redirect.ts`, `apps/web/src/routes/auth/login.tsx`, `apps/web/src/routes/auth/reset-password.tsx`, and `packages/api/src/features/resume/service.ts` (`getById`, `list`, ownership predicates). Keep server cookie/proxy diagnosis in `apps/server/src/http/auth.ts` and current trusted-origin helpers. Hosted recovery requiring v4 data is a dependency on plan 02, not an excuse to change user IDs here.

Prerequisites: one disposable PostgreSQL database, one controlled mailbox or SMTP capture service, test OAuth applications for the affected providers, and sanitized deployment facts (image digest, origin, proxy scheme, enabled auth methods). Obtain these through the operator; do not search local secrets or use reporter identities. Existing production credentials do not authorize login attempts as a reporter.

## Step-by-step diagnostic and conditional implementation plan

1. Create an issue-specific observation record with UTC attempt time, deployment digest, auth method, browser, first failing request path/status, callback host/path, cookie attribute names, and whether the session endpoint sees a user. Redact all values that grant access. For #3166 also record whether list/get/export disagree for the **same** owner. For #3164/#2837 record reset request acceptance separately from SMTP acceptance and inbox delivery. Verification: each row above has a named failing phase or is explicitly awaiting evidence.
2. Run the commands below unchanged and retain counts. Existing green coverage is the baseline, not a reproduction. In `tests/e2e/specs/auth.spec.ts`, follow the existing email account fixture for register → logout → login → hard reload. For OAuth, exercise new, existing, migrated/legacy-subject, and username-collision fixture identities. Do not simulate success by mocking the whole auth handler. Verification: browser session and returned local user ID agree before/after callback.
3. Branch on evidence. If no session cookie is accepted, compare APP_URL/proxy HTTPS and current `useSecureCookies`, origin, domain/path, and browser rejection reason. Fix deployment instructions/configuration if the app receives the wrong origin; do not disable secure cookies or CSRF. If provider callback fails before session creation, inspect sanitized provider error and database constraint; add a minimal profile fixture to `packages/auth/src/oauth-profile.test.ts` only for the failing identity mapping. If the session exists but resume access fails, add owner/non-owner tests in `packages/api/src/features/resume/service.test.ts`; never remove ownership predicates to make a resume visible.
4. For reset delivery, test configured SMTP success, SMTP rejection, missing configuration, expired token, used token, and OAuth-only account. Add `packages/email/src/transport.test.ts` only if an observed transport defect needs changing; use an in-process transport double, fake destination `recovery@example.test`, and fake reset URL. If changing how delivery failures are surfaced, keep public reset responses non-enumerating and put operator diagnostics behind existing logging conventions. Verification: private diagnostic explains the failure without exposing credentials or account existence.
5. Write the smallest fix for the proved branch and its regression before broadening. One PR may cover multiple rows **only** if the same failing fixture/code path explains each; list the independently verified rows. Do not bundle a new login system, account merge, migration rewrite, or password policy. Verification: the regression fails on the old behavior and passes after the fix; retain deliberate failure cases.
6. Run owner package tests/typechecks and boundaries. With a real test OAuth provider and mailbox, repeat the exact failing flow on a disposable production build and then request an operator retest on the deployed digest. Verification: each issue's closure cell is satisfied independently; otherwise retain `needs_reproduction` with the missing artifact named.

## Regression matrix and commands

Baseline executed here: auth 4 files/21 tests passed; server 105 tests passed and 4 PostgreSQL-gated tests skipped. Auth/API/DB/server typechecks and boundaries passed. No hosted account, external OAuth provider, or real mailbox was tested.

```bash
rtk proxy pnpm --filter @reactive-resume/auth test
rtk proxy pnpm --filter server test
rtk proxy pnpm --filter @reactive-resume/auth --filter @reactive-resume/api --filter @reactive-resume/db --filter server typecheck
rtk proxy pnpm exec turbo boundaries
```

Expected: exit 0; the four skipped OAuth tests are **not** integration proof. Focused future regressions use `rtk proxy pnpm --filter @reactive-resume/auth exec vitest run src/oauth-profile.test.ts` and `rtk proxy pnpm --filter @reactive-resume/api exec vitest run src/features/resume/service.test.ts`. For a new email test, run `rtk proxy pnpm --filter @reactive-resume/email exec vitest run src/transport.test.ts` after creating that file. Browser test pattern: `tests/e2e/specs/auth.spec.ts`; consult the current root Playwright config and dedicated DB fixture before running it. Never point fixture account creation at production.

Red/green cases: existing linked provider keeps same user ID; collision allocates a distinct username; unrelated subject cannot gain another user's resumes; valid local callback works and external callback remains rejected; missing/expired cookie returns login once; valid session survives reload; successful reset preserves resumes; expired/replayed token fails; unknown-address response does not reveal membership; list filters and locked resumes are tested separately from auth failure.

## Done, stop, and maintenance

Done means a concrete current reproduction is fixed or a bounded negative result documents why each original report remains unverified. Do not close six reports based on one happy-path login. STOP when operator identity proof, current deployment trace, mailbox access, or legacy mapping is unavailable; when a proposed change broadens account linking; or when evidence points to data reconciliation requiring plan 02. Preserve provider enablement flags, trusted origins, rate limits, two-factor behavior, reset expiry, and authorization defaults. Review the provider mapping and auth integration tests whenever Better Auth changes; never pin an old library as a substitute for diagnosis. Estimate expands only after a failing branch is selected.

## Exact current source anchors

Line numbers are from the planned source base. These are evidence, not replacement snippets.

`packages/auth/src/oauth-profile.ts:188`:

```ts
			// Better Auth 1.7 forbids `mapProfileToUser` from returning `id`; provider identity is
			// resolved by `accountSubject` and existing local users are matched by `account.accountLinking`.
			const existingImage = image ?? existingUser.image;

			return {
				name: existingUser.name,
				email: existingEmail,
				...(existingImage ? { image: existingImage } : {}),
				username: existingUser.username,
				displayUsername: existingUser.displayUsername,
				emailVerified: existingUser.emailVerified,
```

`packages/auth/src/config.ts:193`:

```ts

		emailAndPassword: {
			enabled: !env.FLAG_DISABLE_EMAIL_AUTH,
			autoSignIn: true,
			minPasswordLength: 8,
			maxPasswordLength: 64,
			requireEmailVerification: false,
			disableSignUp: env.FLAG_DISABLE_SIGNUPS || env.FLAG_DISABLE_EMAIL_AUTH,
			sendResetPassword: async ({ user, url }) => {
				await sendEmail({
					to: user.email,
					subject: "Reset your password",
					react: createElement(ResetPasswordEmail, { url }),
```

`packages/api/src/features/resume/service.ts:477`:

```ts
			.where(
				and(
					eq(schema.resume.userId, input.userId),
					match(input.tags.length)
						.with(0, () => undefined)
						.otherwise(() => arrayContains(schema.resume.tags, input.tags)),
				),
```

