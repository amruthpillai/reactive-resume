# 02 — Decide hosted v4 account recovery and verify account ownership

**Planned at:** `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec` (2026-09-05).  
**Status:** agent-selected scoped recovery plan; production access and source availability gated. **Category:** direction.  
**Priority:** P2. **Effort:** 0.5–1 day verification; recovery effort unknown until backups and policy exist. **Risk:** High: private account data and irreversible reconciliation.  
**Issues:** [#3181](https://github.com/amruthpillai/reactive-resume/issues/3181), [#2760](https://github.com/amruthpillai/reactive-resume/issues/2760).

## Execution contract

This document records a planning-only audit. A future operator request to execute this plan authorizes ordinary repository implementation, verification, commits and PR work within its approved scope; do not ask again for those routine actions. Explicit product decisions and private/production data access remain gates only where named below. Never merge. Use a fresh `codex/` worktree from current `origin/main`, read actual `AGENTS.md`, check `rtk proxy git status --short`, and run intent skill discovery before edits. Use CodeGraph first only when that worktree has `.codegraph/`. Do not reset or overwrite another worker's files. The coordinator owns the plan index; report status rather than editing another worker's index.

Run this exact drift command first:

```bash
rtk proxy git diff --stat 7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec..HEAD -- 'packages/api/src/features/resume/service.ts' 'packages/api/src/features/auth/service.ts' 'packages/auth/src/oauth-profile.ts' 'docs/self-hosting/migration.mdx' 'docs/guides/accessing-the-previous-version.mdx' 'packages/api/src/features/resume/crud.ts' 'apps/web/src/routes/dashboard/resumes/index.tsx' 'tooling/recovery/compare-resume.ts' 'tooling/recovery/compare-resume.test.ts'
```

Expected: no in-scope source changes since the planned base. If output appears, re-read those symbols and compare the excerpts before continuing; stop and report if the diagnosis or approved scope no longer applies. Run shell commands through `rtk` or `rtk proxy`.

Use Node.js 24 and the pnpm version declared in `package.json`; workspace packages consume source through export maps. New browser behavior belongs in `apps/web`, HTTP adapters in `apps/server`, business logic in `packages/api`, auth in `packages/auth`, and database shape in `packages/db`. Never import another package's source by relative path. Preserve existing defaults unless this plan explicitly approves a change. Do not publish credentials, cookies, reset links, private resumes, email addresses, or raw provider logs. Record sanitized status codes, request shape, and credential type only.

## Selected direction and actual gates

**Agent judgment:** use operator-assisted, identity-verified export/recovery for a single affected owner. Preserve both the recovered source and current v5 version; do not repeat a broad cloud migration. This is a selected planning recommendation, not a claim of user approval for production data access. The original request is recovery of missing work, so a non-overwriting scoped export is the least invasive useful result.

No further product preference is needed to begin the read-only diagnosis and build a synthetic recovery procedure. Actual gates remain: an authorized operator must establish ownership, source snapshot availability and its capture time, and approve any access to or delivery of private data. If no source exists, report that factual limit; no code can reconstruct absent records. For #2760, first prove whether the issue is listing/identity rather than assume migration.

## Current issue evidence and boundaries

| Issue | Verified report content | Independent acceptance and closure requirement |
| --- | --- | --- |
| #3181 | Reporter describes hosted v4 outage and resumes edited after the January v4-to-v5 copy that are absent from v5. Requests another copy/recovery. No operator backup inventory or current account mapping supplied. | Establish whether a recoverable v4 snapshot exists for the verified owner and relevant time; provide its approved recovery/export result without overwriting newer v5 content. If data is unavailable, operator must explain that factual outcome. A local importer test is not account recovery. |
| #2760 | Reporter sees empty workspace, same-name creation conflict, and successful new creation still invisible, including incognito. This is stronger than a generic migration complaint but does not prove records belong to the authenticated user. No current list/create responses or version. | Correlate authenticated user, list filters and create response, then restore normal listing of that owner's records or perform approved reconciliation. Both existing and newly created resumes remain visible after reload. Do not close solely because #3181 recovery succeeds. |

No common root cause proved. #3181 is a hosted data availability/retention decision. #2760 may instead be account identity, query filters, client cache, or data mapping. Authentication diagnosis depends on plan 01 if the account cannot be verified. Do not assume an email address or resume title proves ownership.

## Current code and documentation

`packages/api/src/features/resume/service.ts` filters `list` by `userId` plus tags and checks ownership in `getById` and updates. Slug uniqueness is per user. `packages/api/src/features/auth/service.ts` exports explicit profile fields, owned resumes and independent cover letters. `packages/auth/src/oauth-profile.ts` preserves existing linked-user metadata. These are the seams for observing current ownership; none grants a way to recover an unavailable v4 database.

`docs/self-hosting/migration.mdx` explicitly locates historical migration scripts at tag `v5.0.20`, with source/target databases and an old-to-new user mapping. That documentation is for self-hosted operators and does not authorize replay against cloud. Current source does not contain those historical scripts. Never copy a historical destructive command into this plan without reviewing that tag and an approved recovery policy.

## Verification steps before accessing private data

1. Read both issue bodies/comments through the authenticated issue tracker and preserve a sanitized observation table with deployment/version, date range, old/new account method, and missing versus invisible records. **Verify:** `rtk proxy gh issue view 3181 --repo amruthpillai/reactive-resume --json number,title,body,comments` and corresponding command for `2760` return the intended issue. Do not paste their personal contact information into output files.
2. Check current source drift and the owner predicate. **Verify:** `rtk proxy rg -n 'eq\(schema.resume.userId, input.userId\)|resume_slug_user_id_unique' packages/api/src/features/resume/service.ts` finds the ownership/uniqueness boundaries. In a disposable account, create `Recovery Fixture`, reload list with empty tags, then fetch by ID as owner and another user. Browser pattern: `tests/e2e/specs/resume-lifecycle.spec.ts`; API pattern: `packages/api/src/features/resume/service.test.ts`. Expected: only owner sees the created record; no historical account data involved.
3. With an authorized operator, inspect **read-only metadata** for snapshot availability, capture date, user mapping existence and counts for a verified owner. Do not expose DB URLs or row contents. Verification artifact must explicitly say `ownerVerified`, `sourceAvailable`, `sourceTimestamp`, `targetTimestamp`, and whether both versions differ. If any value is unknown, mark unknown rather than inventing it. No production query or recovery is implied by local filesystem access.
4. For #2760, compare create response's returned resume ID, authenticated session user ID, unfiltered list response, and UI display in the same session. Redact identifiers before committing evidence. **Verify:** run the service and auth-export tests below; a future regression must isolate response omitted by server versus response hidden by client. If the server returns the record, narrow follow-up to the owning web list/cache seam rather than migration.
5. Report the observation table and operational access gate to the coordinator. **Verify:** `rtk proxy git status --short` shows no source, data, migration, or external-system changes from this verification. Continue with the synthetic workflow below; stop only at the explicit private-data gate.

## Test cases and exact commands

Planning executed auth/API/DB/server typechecks and boundaries clean; auth 21 tests passed. The following existing service/export tests are the focused baseline, not proof of hosted recovery:

```bash
rtk proxy pnpm --filter @reactive-resume/api exec vitest run src/features/resume/service.test.ts src/features/auth/export.test.ts
rtk proxy pnpm --filter @reactive-resume/auth test
rtk proxy pnpm --filter @reactive-resume/api --filter @reactive-resume/db --filter @reactive-resume/auth typecheck
rtk proxy pnpm exec turbo boundaries
```

Expected exit 0. Case specifications for the selected scoped recovery design: verified owner with old-only record; newer target record conflict; repeated dry-run produces no writes; repeated approved recovery does not duplicate; missing user mapping stops; unrelated owner receives nothing; invalid legacy JSON reports a recoverable error instead of empty replacement; #2760 create/list/reload agrees with no filters. These are acceptance constraints, not approval to implement a migration.

## Actionable scoped recovery procedure

1. Write a recovery runbook in `docs/self-hosting/migration.mdx` and clarify hosted versus self-hosted access in `docs/guides/accessing-the-previous-version.mdx`. Describe a per-owner case record with source snapshot time, target resume ID, owner-verification status, content hash and proposed outcome. Do not put actual records or mappings in Git. The default outcome is a private export, not database mutation. **Verify:** `rtk proxy rg -n 'snapshot|owner|export|overwrite' docs/self-hosting/migration.mdx docs/guides/accessing-the-previous-version.mdx` finds each explicit safeguard; direct-lint both edited files.
2. Use a synthetic source record and current `defaultResumeData` from `@reactive-resume/schema/resume/default` to rehearse outcomes: identical source/target means no-op; old-only or divergent source produces a separate recovered JSON document; absent mapping, invalid source JSON or unavailable snapshot stops with a named reason. The actual historical converter must be read in isolated tag `v5.0.20` before using its format. Do not invent legacy fields. If conversion requires current tooling, proposed files are `tooling/recovery/compare-resume.ts` and `tooling/recovery/compare-resume.test.ts`; keep them pure, taking already-exported JSON rather than connecting to databases. **Verify:** `rtk proxy pnpm --filter @reactive-resume/tooling exec vitest run recovery/compare-resume.test.ts` passes identical/divergent/invalid/unknown-owner fixtures after those files exist, and `rtk proxy pnpm --filter @reactive-resume/tooling typecheck` exits 0.
3. Produce a dry-run manifest containing only synthetic IDs, source/target hashes and one of `no-op`, `export-copy`, `blocked`. Repeating the same inputs produces the same manifest. The tool must not accept a database URL, write to source records or silently replace target data. **Verify:** the tests assert no mutation of input objects, deterministic output, and blocking of invalid/missing identity mapping. Keep any private operational manifest outside the repository.
4. At the operator gate, obtain authorized access to the verified owner's available snapshot and compare it against current data using the rehearsed procedure. Deliver a recovered JSON copy privately through the operator's approved channel. This is a separate private-data action; a request to execute source work is not permission to send private records. **Verify:** operator records source hash, delivered hash and verified recipient outside Git; hashes match, source and target data remain unchanged.
5. The owner may import the recovered resume as a new resume using the existing authenticated import flow. `packages/api/src/features/resume/crud.ts#import` creates a fresh ID/name/slug and snapshots the import. Do not add a bulk merge endpoint. **Verify:** `rtk proxy pnpm --filter @reactive-resume/api exec vitest run src/features/resume/service.test.ts` passes; on a disposable account, current and recovered documents coexist after reload with selected recovered fields intact. Any production import is performed by the owner or separately authorized operator.
6. For #2760, use the earlier create/list/session comparison. If current service omits an owned row, add the exact server regression; if response includes it but UI hides it, inspect `apps/web/src/routes/dashboard/resumes/index.tsx` and its query/filter/cache consumers and add a focused UI regression. If identity differs, return to plan 01 without reassigning records. **Verify:** same-session create → unfiltered list → reload returns the same controlled resume ID, while another owner remains excluded.

## Scope, stop, and maintenance

Default source scope is the two recovery docs plus pure synthetic comparison tooling only if conversion comparison is needed. Runtime fixes for #2760 require a demonstrated failing boundary, following plan 01's diagnosis. No broad cloud migration, automatic account merging by email, password reset, progress-file deletion or target overwrite is included.

STOP without proven owner identity, an available source snapshot, reviewed legacy format or authorized private-data access. STOP when a proposed write would replace newer target data; export a separate copy instead. Done requires the issue-specific outcomes in the table, a documented no-source result where applicable, and green synthetic tests for any new tooling. Preserve existing authorization and secret-excluding export behavior. Future recovery tools must stay read-only with respect to source/target data and must never make live database access a default.

## Additional planning verification

After drafting, the following exact combined API command executed successfully: 7 files, 93 tests passed, exit 0. This verifies local contracts, not hosted recovery, private-data access, an external provider, or browser deployment.

```bash
rtk proxy pnpm --filter @reactive-resume/api exec vitest run src/features/ai/service.test.ts src/features/ai-providers/service.test.ts src/features/ai/url-policy.test.ts src/features/resume/service.test.ts src/features/auth/export.test.ts src/features/agent/tools.test.ts src/features/ai/capabilities.test.ts
```

## Documentation command baseline

Direct `pnpm exec markdownlint-cli2 --no-globs` inspection of the seven existing recovery/export/history/agent documentation files passed with zero issues during this planning revision. No documentation outside this plan file was edited. The new documentation steps must rerun their exact smaller file lists after changes.

## Exact current source anchors

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

`packages/api/src/features/auth/service.ts:61`:

```ts
			.from(schema.resume)
			.where(eq(schema.resume.userId, input.userId));

		const coverLetters = await db.select().from(schema.coverLetter).where(eq(schema.coverLetter.userId, input.userId));
		return {
			exportedAt: new Date().toISOString(),
			user: userRecord,
			resumes,
			coverLetters: coverLetters.map((letter) => coverLetterSchema.parse(letter)),
```

