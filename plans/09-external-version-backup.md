# 09 — Document explicit JSON backup in a user-controlled Git repository

**Planned at:** `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec` (2026-09-05).  
**Status:** agent-selected documentation plan; ready for future execution. **Category:** docs.  
**Priority:** P2. **Effort:** 0.5–1 day documentation and synthetic workflow verification. **Risk:** Low for documentation; private data must stay local during verification.  
**Issue:** [#2705](https://github.com/amruthpillai/reactive-resume/issues/2705).

## Execution contract

This document records a planning-only audit. A future operator request to execute this plan authorizes ordinary repository implementation, verification, commits and PR work within its approved scope; do not ask again for those routine actions. Explicit product decisions and private/production data access remain gates only where named below. Never merge. Use a fresh `codex/` worktree from current `origin/main`, read actual `AGENTS.md`, check `rtk proxy git status --short`, and run intent skill discovery before edits. Use CodeGraph first only when that worktree has `.codegraph/`. Do not reset or overwrite another worker's files. The coordinator owns the plan index; report status rather than editing another worker's index.

Run this exact drift command first:

```bash
rtk proxy git diff --stat 7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec..HEAD -- 'packages/api/src/features/auth/service.ts' 'packages/api/src/features/auth/router.ts' 'packages/api/src/features/auth/export.test.ts' 'packages/api/src/features/resume/versions.ts' 'packages/api/src/features/resume/service.ts' 'docs/guides/undoing-changes-and-version-history.mdx' 'apps/web/src/features/resume/export/use-resume-export.ts' 'apps/web/src/features/cover-letters/editor-dialog.tsx' 'apps/web/src/features/settings/pages/account.tsx' 'docs/guides/exporting-your-resume.mdx'
```

Expected: no in-scope source changes since the planned base. If output appears, re-read those symbols and compare the excerpts before continuing; stop and report if the diagnosis or approved scope no longer applies. Run shell commands through `rtk` or `rtk proxy`.

Use Node.js 24 and the pnpm version declared in `package.json`; workspace packages consume source through export maps. New browser behavior belongs in `apps/web`, HTTP adapters in `apps/server`, business logic in `packages/api`, auth in `packages/auth`, and database shape in `packages/db`. Never import another package's source by relative path. Preserve existing defaults unless this plan explicitly approves a change. Do not publish credentials, cookies, reset links, private resumes, email addresses, or raw provider logs. Record sanitized status codes, request shape, and credential type only.

## Selected direction

**Agent judgment:** document explicit local JSON export followed by user-controlled Git commits. This directly addresses #2705's external version-control request using existing export surfaces. It introduces no remote Git integration, credentials, automatic commits or background backup. This is a planning choice, not a claim that the user approved publishing private data.

No additional product question is needed for this bounded workflow. The user chooses whether and where to push their own repository. Do not promise whole-account restore, offline image bundling, or an internal named-version feature that this plan does not provide.

## Current evidence and source seams

Issue #2705 requests resume and cover-letter JSON in external Git. A comment proposing internal named versions is an alternative, not the original requested outcome. Current `packages/api/src/features/resume/service.ts` keeps 30 rolling snapshots with a two-minute manual-save throttle; restoration uses the normal update path and preserves prior versions. That feature remains unchanged.

`apps/web/src/features/resume/export/use-resume-export.ts#onDownloadJSON` serializes `resume.data` with two-space indentation. Embedded cover-letter data is part of that resume data. `apps/web/src/features/cover-letters/editor-dialog.tsx` has an independent-letter Export JSON action. `apps/web/src/features/settings/pages/account.tsx` offers Export my data using `auth.exportData`; `packages/api/src/features/auth/service.ts#exportData` includes owned resumes and independent letters, explicit public profile fields and `exportedAt`, with image URLs as references. The existing export test covers both embedded and independent letters. An account archive is not the same format as a single resume import.

## Exact scope and defaults

Modify `docs/guides/exporting-your-resume.mdx` and `docs/guides/undoing-changes-and-version-history.mdx`. Add a concise external-Git subsection to the existing export guide rather than a new product screen. Source/runtime files are evidence only. If verification reveals an actual exporter defect, stop and report its fixture; do not silently broaden this documentation task.

Preserve existing JSON schemas, keys, IDs, ordering, `exportedAt`, image references, 30-version retention, and non-destructive restore. No credential storage, API changes, Git automation, remote uploads or new dependencies. Account exports contain personal data even though authentication secrets are excluded; the guide must explain repository visibility and deliberate publication in plain language at the Git step.

## Step-by-step documentation and verification

1. Verify each existing export entry point with a synthetic account: one resume named `Git Backup Fixture`, an embedded letter and an independent letter containing only `Backup Fixture` text. Record which UI action produces which JSON shape. **Verify:** `rtk proxy pnpm --filter @reactive-resume/api exec vitest run src/features/auth/export.test.ts src/features/resume/service.test.ts` exits 0; these tests passed in the planning 93-test combined API run. Browser fixtures must use a disposable DB and avoid real account data.
2. In the export guide, write the sequence: export one resume as JSON; export each independent cover letter separately if desired; use Export my data for an additional account archive; create a local folder outside the Reactive Resume source checkout; save exports under stable descriptive filenames such as `resume.json` and `cover-letter.json`. Clearly state that account archives include metadata and are not accepted as a single resume JSON import. **Verify:** `rtk proxy rg -n 'resume.json|cover-letter.json|account|image|Git' docs/guides/exporting-your-resume.mdx` locates all format/scope distinctions.
3. Include this exact **local-only** command sequence, run from a newly created synthetic backup folder. `git init` creates an empty repository; `git add` stages only the two named fixture files; `git diff --cached` lets the owner inspect contents before committing. Do not put `git push` or a remote URL in the automatic sequence:

   ```bash
   rtk proxy git init
   rtk proxy git add -- resume.json cover-letter.json
   rtk proxy git diff --cached --stat
   rtk proxy git diff --cached -- resume.json cover-letter.json
   rtk proxy git commit -m "Back up resume and cover letter"
   ```

   Existing exports use indentation and stable filenames produce useful diffs; do not claim unchanged account exports are byte-identical because `exportedAt` changes. Tell the owner to inspect Git diffs and decide separately whether to publish to a private remote. **Verify:** after two synthetic exports with one changed visible name, `rtk proxy git diff -- resume.json` shows that field change; a local commit succeeds using the executor's configured Git identity. If no Git identity exists, stop this optional fixture commit and report instead of configuring the user's global identity.
4. Document recovery by selecting an earlier **single-resume** JSON revision and importing it as a new resume, preserving the current document. Use `git show HEAD:resume.json` to inspect the committed synthetic version; use the normal file chooser for import. Explain that URL-based images require their storage to remain available and that restoring an account archive wholesale is outside this workflow. **Verify:** a disposable import round trip preserves name, non-ASCII rich text and embedded letter fields; existing and imported documents coexist. Test pattern: `tests/e2e/specs/resume-lifecycle.spec.ts` and `packages/api/src/features/resume/service.test.ts`.
5. Add a short cross-reference in the history guide explaining rolling in-app versions versus owner-managed Git history. Link the existing export guide and avoid promising new retention or remote sync. **Verify:** `rtk proxy rg -n 'Git|exporting-your-resume' docs/guides/undoing-changes-and-version-history.mdx` finds the link and scope.
6. Direct-lint exactly the two docs and review the final diff. **Verify:** `rtk proxy pnpm exec markdownlint-cli2 --no-globs docs/guides/exporting-your-resume.mdx docs/guides/undoing-changes-and-version-history.mdx` and `rtk proxy git diff --check` exit 0. `rtk proxy git diff --name-only` contains only the two approved docs. Commands in this section are executor recipes; no export or Git repository was created during planning.

## Regression and completion criteria

Existing API export/version tests passed in the planning combined run (7 files, 93 tests total); API/DB/auth/server typechecks and boundaries passed. No new runtime test is required for accurate prose. Verify the literal workflow with synthetic data and a disposable local repository: selected files only are staged; a changed field is visible in diff; both letter types have documented exports; secrets are absent from account-export fixture; previous single-resume JSON can be imported without replacing the current resume; unavailable image URL is documented honestly.

Done for #2705 means the project has a tested, self-contained external Git workflow matching the original data portability request. Do not claim automatic synchronization or universal archive restoration. STOP if existing export lacks a required document type, synthetic restore loses content, or the proposed task expands to remote synchronization. Those need a separate concrete defect or product plan. Future export/schema changes must update the guide's format distinctions and round-trip fixture.

## Documentation command baseline

Direct `pnpm exec markdownlint-cli2 --no-globs` inspection of the seven existing recovery/export/history/agent documentation files passed with zero issues during this planning revision. No documentation outside this plan file was edited. The new documentation steps must rerun their exact smaller file lists after changes.

## Exact current source anchors

`packages/api/src/features/resume/service.ts:64`:

```ts
// Version history: keep a bounded, rolling window of snapshots per resume.
const MAX_VERSIONS_PER_RESUME = 30;
// Manual-save milestones are debounced server-side: an autosave only checkpoints if the newest
// snapshot is older than this. Explicit milestones (import, AI edit, restore) always checkpoint.
const SNAPSHOT_THROTTLE_MS = 2 * 60 * 1000;
```

`packages/api/src/features/resume/versions.ts:24`:

```ts
	restoreVersion: protectedProcedure
		.route({
			method: "POST",
			path: "/resumes/{resumeId}/versions/{versionId}/restore",
			tags: ["Resumes"],
			operationId: "restoreResumeVersion",
			summary: "Restore a resume version",
			description:
				"Non-destructively restores a resume to a previous version snapshot by writing that snapshot's data back through the normal update path. Prior versions are preserved and the restore itself becomes a new snapshot. Only the resume owner can restore versions. Requires authentication.",
			successDescription: "The restored resume with its full data.",
```

`packages/api/src/features/auth/service.ts:64`:

```ts
		const coverLetters = await db.select().from(schema.coverLetter).where(eq(schema.coverLetter.userId, input.userId));
		return {
			exportedAt: new Date().toISOString(),
			user: userRecord,
			resumes,
			coverLetters: coverLetters.map((letter) => coverLetterSchema.parse(letter)),
```


`apps/web/src/features/resume/export/use-resume-export.ts:56`:

```ts
	const onDownloadJSON = useCallback(() => {
		if (!resume) return;
		const blob = new Blob([JSON.stringify(resume.data, null, 2)], { type: "application/json" });
		downloadWithAnchor(blob, generateFilename(getExportName(resume), "json"));
	}, [resume]);
```
