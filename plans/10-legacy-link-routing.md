# 10 — Retired-link routing and owner notifications (not planned)

**Planned at:** `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec` (2026-09-05).  
**Status:** superseded by maintainer decision on 2026-09-06; do not implement. **Category:** declined feature.
**Priority:** P2. **Effort:** 2–4 days for prospective notices and transaction tests. **Risk:** High: attribution, privacy and failed-request counting.  
**Issue:** [#2836](https://github.com/amruthpillai/reactive-resume/issues/2836).

## Final disposition

Maintainer declined this feature after planning. Retired-link support is not planned because redirect lifecycle,
retention, slug reuse, ownership, privacy-safe tracking, and invalid-link error handling create disproportionate
ongoing overhead. PR #3463 was closed unmerged, and the decision is recorded in
[issue #2836](https://github.com/amruthpillai/reactive-resume/issues/2836#issuecomment-5556080394).

Remaining content below is retained as historical planning evidence only. It is non-executable and must not be
used to start implementation.

## Historical execution contract (non-executable)

This archived document grants no implementation authorization. Do not run its commands, create its schema, or reopen its branch. Work may resume only after a new explicit maintainer decision reverses the 2026-09-06 `not_planned` disposition; ordinary execution requests for this package do not override that decision.

Run this exact drift command first:

```bash
rtk proxy git diff --stat 7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec..HEAD -- 'packages/api/src/features/resume/service.ts' 'packages/db/src/schema/resume.ts' 'apps/web/src/routes/$username/$slug.tsx' 'tests/e2e/specs/resume-views.spec.ts' 'packages/api/src/features/resume/statistics.ts' 'packages/api/src/features/resume/statistics.test.ts' 'packages/api/src/features/resume/view-dedup.ts' 'apps/web/src/routes/builder/$resumeId/-sidebar/right/sections/statistics.tsx' 'apps/web/src/routes/builder/$resumeId/-sidebar/right/sections/statistics.test.tsx' 'apps/web/locales/en-US.po' 'docs/guides/sharing-your-resume-publicly.mdx' 'packages/api/src/features/resume/retired-links.ts' 'packages/api/src/features/resume/retired-links.test.ts' 'tests/e2e/specs/retired-link-notices.spec.ts'
```

Expected: no in-scope source changes since the planned base. If output appears, re-read those symbols and compare the excerpts before continuing; stop and report if the diagnosis or approved scope no longer applies. Run shell commands through `rtk` or `rtk proxy`.

Use Node.js 24 and the pnpm version declared in `package.json`; workspace packages consume source through export maps. New browser behavior belongs in `apps/web`, HTTP adapters in `apps/server`, business logic in `packages/api`, auth in `packages/auth`, and database shape in `packages/db`. Never import another package's source by relative path. Preserve existing defaults unless this plan explicitly approves a change. Do not publish credentials, cookies, reset links, private resumes, email addresses, or raw provider logs. Record sanitized status codes, request shape, and credential type only.

## Selected direction and boundaries

**Agent judgment:** record future resume-slug retirements and show aggregate old-link attempts to the owner inside existing resume statistics. Keep the public old URL returning the same safe 404. Do not add automatic redirects, emails, push notifications, visitor identities, or attribution of unknown historical URLs. This is a narrow reading of #2836's request for notice when an old link is visited, not a claim of prior user approval for a broader redirect product.

Select routine limits explicitly: cover resume-slug changes under the same still-current username; keep up to 50 retired paths per resume for 90 days; no backfill of unrecorded links; no reserved-slug behavior; a currently valid route always takes precedence. These are agent-selected implementation defaults that bound storage and preserve URL reuse. Display the coverage/retention limit in the owner UI. A later request for historic v4 links, username-change tracking, email delivery or redirects is separate scope, not a blocker for this prospective notice.

## Current evidence and seams

Issue #2836 does not supply enough old-path history to identify an existing current defect. `packages/api/src/features/resume/service.ts#getBySlug` resolves current username+slug, throws `NOT_FOUND` if absent, and only then applies public/password/statistics behavior. `update` writes the current slug directly. `packages/db/src/schema/resume.ts` has current per-user slug uniqueness and public-view statistics but no retired-link attribution in the observed paths.

The statistics panel lives at `apps/web/src/routes/builder/$resumeId/-sidebar/right/sections/statistics.tsx` and reads protected statistics endpoints. `packages/api/src/features/resume/statistics.ts` owns these contracts. `view-dedup.ts` owns in-process view deduplication; follow its time-window/key pattern with a separate retired-link cache, not the ordinary public-view count. Do not redefine a failed old-link attempt as a successful resume view.

## Exact scope and schema design

Modify `packages/db/src/schema/resume.ts` and its export surface if needed; generate one additive migration through the existing DB generator. New table `resume_retired_link` contains generated ID, owner user ID and resume ID (both foreign keys with cascade), username and slug at retirement, retired timestamp, attempt count default zero and nullable last-attempt timestamp. Enforce unique username+slug for the remembered path; index resume ID plus retired timestamp for bounded owner listing. Never store visitor IP, user agent, email or resume content in this table.

Create `packages/api/src/features/resume/retired-links.ts` and `retired-links.test.ts` for capture, bounded lookup/count, pruning and owned listing. Integrate only the necessary create/update/getBySlug paths in `service.ts`; expose a protected `getRetiredLinks` procedure in `statistics.ts` and test it in `statistics.test.ts`. Update the existing builder statistics component and its `.test.tsx`, with localized strings via `apps/web/locales/en-US.po`. Add `tests/e2e/specs/retired-link-notices.spec.ts`. Existing public route need not change because its 404 behavior is preserved. Document prospective coverage in `docs/guides/sharing-your-resume-publicly.mdx`.

No username-history migration, domain table, private-data disclosure, external notification transport, blanket redirect or mass reservation of old slugs. Plan 08 may reuse the public visibility tests but does not share this storage model.

## Step-by-step implementation and verification

1. Add the minimal table and generate an additive migration. Use a disposable migration environment, never the affected cloud database. Existing records need no backfill; fresh and populated upgrade should create an empty table. **Verify:** `rtk proxy dotenvx run -f .env.retired-links-test.local -- pnpm db:generate` generates only this schema addition after the new schema exists; review SQL for no drops/rewrites, then apply with `rtk proxy dotenvx run -f .env.retired-links-test.local -- pnpm db:migrate`. `rtk proxy pnpm --filter @reactive-resume/db typecheck` exits 0. The environment must point to a disposable DB and contain only synthetic credentials.
2. Capture the old path inside the existing slug-update transaction only when old and new slugs differ. Read old slug plus owner username with the locked resume row. Store/upsert the retired record, prune entries older than 90 days and beyond newest 50 for that resume. Ordinary data saves do not write retirement rows. If the transaction fails, neither slug nor retirement changes. **Verify:** `rtk proxy pnpm --filter @reactive-resume/api exec vitest run src/features/resume/retired-links.test.ts src/features/resume/service.test.ts` passes unchanged-slug, successful-rename, failed-rename rollback, retention and cap cases.
3. Preserve current-path precedence and reuse. On create or rename into a path, remove any matching retired record inside that transaction; do not reject a currently valid slug because it was retired. At old-link lookup, require the remembered owner still has the recorded username, the target resume still belongs to that owner and is public, the record is unexpired, and no live current route claims the same path. If any check fails, treat it as ordinary unknown 404. **Verify:** tests cover same-owner reuse by another resume, renamed/reused username, deleted/private target, expired entry and competing live route. No unrelated owner gains notices or access.
4. On the `getBySlug` no-current-row branch only, attempt a recognized-retirement lookup and best-effort increment, then return the original `NOT_FOUND`. Counting must happen outside a transaction that is subsequently rolled back by throwing that error. Use a separate dedup cache with the same one-hour window as `view-dedup.ts`, `retired:<recordId>:<clientKey>` keys, and a hard cap of 50,000 entries: prune expired entries, then evict oldest entries before inserting if still full. The existing helper only prunes expired entries, so do not assume its comment establishes a hard active-entry cap. Exclude the owner. Test cap behavior without modifying the ordinary-view helper in this feature. Unknown paths allocate no per-path cache entries or DB rows. If counting fails, preserve the same 404; it must not cause 500 or leak target information. **Verify:** helper/service tests assert one recognized attempt, duplicate suppression, owner exclusion, lookup/count failure still 404, no ordinary view increment, and unknown probes create no rows.
5. Add protected `getRetiredLinks` listing by resume+owner; prune expired rows lazily and return at most 50 sanitized path/count/last-attempt records. Do not expose this through the public 404 body or public resume data. **Verify:** `rtk proxy pnpm --filter @reactive-resume/api exec vitest run src/features/resume/statistics.test.ts src/features/resume/retired-links.test.ts` covers another user denied, missing resume denied, expired rows omitted and stable newest-first order. Keep existing getById/daily statistics response shapes unchanged.
6. Show an owner-only subsection in builder Statistics: "Old link attempts", retired path, aggregate count and last attempt, plus a concise note that only recent slug changes made after this feature are tracked. Preserve public-view/download totals. Render no list when empty. Do not add visitor information or an email toggle. **Verify:** `rtk proxy pnpm --filter web exec vitest run 'src/routes/builder/$resumeId/-sidebar/right/sections/statistics.test.tsx'` passes empty/recorded/expired/error-state fixtures; `rtk proxy pnpm --filter web typecheck` exits 0. Use current translation extraction convention and review only newly introduced source messages.
7. Run the production controlled flow below and document limits in the public-sharing guide. **Verify:** new E2E cases pass, API/DB/web typechecks and `rtk proxy pnpm exec turbo boundaries` exit 0; `rtk proxy git diff --check` passes. Review migration, privacy, failed-request counting and transaction rollback carefully before opening the focused PR.

## Portable red/green E2E fixture

Use two disposable accounts and a public resume with username `retired-owner` and slug `first-path`. Rename to `second-path` as owner, visit the old URL anonymously, and verify public response remains 404 while owner Statistics shows one attempt. Reload the old URL within the dedup window; count stays one. Visit the new URL; ordinary view increments independently. Owner visit to the old path does not count. Another owner cannot query the notice endpoint. Make target private or delete it, then retry the old URL; no content/identity leak and no new notice. Reuse `first-path` for a new live resume; it resolves normally and old-record attribution is removed. Advance fixture clock beyond 90 days and verify expiry; use helper tests for 50-record cap rather than 51 browser renames.

Root `playwright.config.ts` starts `pnpm start`; use unique APP_URL/PORT and disposable DB in `.env.retired-links-test.local` to avoid production/other workers:

```bash
rtk proxy pnpm build
rtk proxy dotenvx run -f .env.retired-links-test.local -- pnpm exec playwright test tests/e2e/specs/retired-link-notices.spec.ts tests/e2e/specs/resume-views.spec.ts --project=chromium
rtk proxy pnpm --filter @reactive-resume/api --filter @reactive-resume/db --filter web typecheck
rtk proxy pnpm exec turbo boundaries
```

These are future implementation commands; new retired-link tests/table do not exist during planning. Existing resume service tests passed within the combined 7-file/93-test API run, server suite 105 passed with four DB-gated OAuth tests skipped, and API/auth/DB/server types/boundaries passed. No old-link feature behavior was claimed as already verified.

## Completion, stop conditions, and maintenance

Done means future recorded slug retirements produce bounded, owner-visible attempt notices while valid URLs and unknown 404s retain existing behavior. The guide explicitly excludes unrecorded historical paths and username changes. Do not close #2836 as recovery of every historical URL; describe the exact prospective coverage.

STOP if reliable owner/path attribution cannot be maintained in the current transaction model, source drift changes uniqueness/authorization, or the requested scope expands to redirects/external messages/historical reconstruction. Routine selected caps and display choices do not need another product interview. Preserve data minimization, current path priority, ownership checks and 404 behavior. Revisit this feature when username/slug uniqueness or account deletion changes; ensure cascades and live-route precedence stay covered.

## Exact current source anchors

`packages/api/src/features/resume/service.ts:530`:

```ts
			.from(schema.resume)
			.innerJoin(schema.user, eq(schema.resume.userId, schema.user.id))
			.where(and(eq(schema.resume.slug, input.slug), eq(schema.user.username, input.username)));

		if (!resume) throw new ORPCError("NOT_FOUND");

		const viewer = input.currentUserId ? { id: input.currentUserId } : null;
		assertCanView(resume, viewer);

		if (resume.hasPassword && !hasResumeAccess(input.requestHeaders, resume.id, resume.passwordHash)) {
			throw new ORPCError("NEED_PASSWORD", {
				status: 401,
				data: { username: input.username, slug: input.slug },
			});
		}

		if (shouldCountForStatistics(resume, viewer)) {
			const key = `${resume.id}:${clientKeyFromHeaders(input.requestHeaders)}`;
			if (shouldCountView(key, Date.now())) {
				await resumeService.statistics.increment({ id: resume.id, views: true });
```

`packages/api/src/features/resume/service.ts:624`:

```ts
				const normalizedData = input.data ? parseWritableResumeData(input.data) : undefined;
				const updateData: Partial<typeof schema.resume.$inferSelect> = {
					...(input.name !== undefined ? { name: input.name } : {}),
					...(input.slug !== undefined ? { slug: input.slug } : {}),
					...(input.tags !== undefined ? { tags: input.tags } : {}),
					...(normalizedData ? { data: normalizedData } : {}),
```


`packages/api/src/features/resume/view-dedup.ts:15`:

```ts
export function shouldCountView(key: string, now: number): boolean {
	const expiry = seen.get(key);
	if (expiry !== undefined && expiry > now) return false;

	if (seen.size >= MAX_ENTRIES) {
		for (const [k, exp] of seen) {
			if (exp <= now) seen.delete(k);
		}
	}

	seen.set(key, now + WINDOW_MS);
	return true;
}
```
