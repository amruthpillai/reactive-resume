# Plan 10 implementation report

## Outcome

Implemented prospective retired-link attempt notices for issue #2836 on branch
`codex/issue-2836-retired-link-notices`. Implementation commit:
`b33962e3ffd5f563f40a84af108771bd6a0febca` (`feat: add retired resume link notices`).

Issue remains open. Historical cause remains unknown. No issue mutation, push, merge, or PR occurred; PR status is **not
created**. Branch awaits independent coordinator review before any PR.

## Live and drift state

- Planned base and refreshed `origin/main`: `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec`.
- Approved plan read from planning commit `a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d` because planning checkout HEAD
  differed.
- Required in-scope drift command returned no output.
- GitHub issue #2836 was open with no new comments. Open-PR scan found no competing retired-link implementation.
- Runtime prerequisites matched: Node 24.20.0 and pnpm 11.25.0.
- Root Intent inventory ran. Loaded Drizzle schema/migration/generate, dotenvx, and TanStack not-found/error guidance.

## Implemented unit

- Added `resume_retired_link` schema and generated migration `20260906000441_green_hitman`.
- Captures prior username/slug inside locked slug-update transaction only when slug changes.
- Removes matching same-owner retired slug inside create/rename transaction so live reuse wins.
- Keeps unexpired newest 50 records per resume for 90 days.
- Recognizes only records whose target remains owned by recorded owner, public, unexpired, and under owner's current
  username.
- Current live route retains priority. Recognized retired route increments aggregate attempts best-effort, then returns same
  `NOT_FOUND` as unknown route.
- Excludes owner. One-hour separate dedup cache uses `retired:<recordId>:<clientKey>` keys and hard 50,000-entry cap.
- Adds protected owner-only sanitized listing: path, aggregate count, nullable last-attempt timestamp.
- Adds Statistics UI section, five en-US Lingui messages, public-sharing documentation, and full disposable-account E2E.

## Migration evidence

- Generated through repository Drizzle workflow against disposable PostgreSQL database
  `retired_links_task_fd191afc86ba` only.
- Fresh apply passed; repeated apply passed; new table remained empty.
- Populated upgrade used separate disposable database `retired_links_upgrade_task_fd191afc86ba`: inserted synthetic user and
  resume, simulated pre-migration ledger/table state, reapplied migration, and verified result `1,0` (existing resume kept,
  retired-link table empty).
- SQL review: one `CREATE TABLE`, one `CREATE INDEX`, two cascading foreign keys. No drop, rename, rewrite, backfill, or data
  copy.
- Snapshot contains generated table/columns/index/foreign keys/unique constraint. Migration SQL contains no unrelated schema
  statements.

## TDD evidence

RED observed before implementation:

- DB schema test failed because `resumeRetiredLink` did not exist.
- Retired-link service tests failed on missing policy/service/dedup exports.
- Resume service tests failed on missing capture, reuse removal, recognition, count, and owner-exclusion behavior.
- Statistics router tests failed on missing protected method.
- Statistics DOM tests failed on absent section, limits note, and singular/plural rendering.
- Initial E2E exposed incorrect exact-list assumption; next run exposed created resumes default private. Assertions were narrowed
  to required records, and live-reuse fixture now explicitly publishes created resume.

GREEN:

- DB focused: 1 file, 2 tests passed.
- API focused: 3 files, 85 tests passed.
- Web focused: 1 file, 8 tests passed.
- E2E: `retired-link-notices.spec.ts` plus required `public-sharing.spec.ts`, Chromium, 2/2 passed.
- Full monorepo `pnpm test`: 19/19 package tasks passed. Existing React `act(...)` warnings remained non-failing.

## Verification

- `pnpm --filter @reactive-resume/db typecheck`: passed.
- `pnpm --filter @reactive-resume/api typecheck`: passed.
- `pnpm --filter web typecheck`: passed.
- `pnpm exec turbo boundaries`: 1,412 files checked, no issues.
- `pnpm build`: 3/3 build tasks passed.
- `pnpm lingui:extract`: passed. It exposed unrelated pre-existing catalog drift across other locales; that 19k-line generated
  churn was excluded, retaining only five new en-US messages required by plan.
- Narrow non-writing Biome: 12 files checked, no fixes.
- Write-capable `pnpm check` disclosed before running: passed, fixed one in-scope file, and resulting diff was inspected.
- Pre-commit Lefthook conflict-marker, Biome, and commitlint gates passed.
- Final `git diff --check`: passed.
- Skipped DB/E2E gates: none.

## Privacy, consistency, and residual risk

Facts:

- Stored fields are owner ID, resume ID, retired username/slug/timestamp, aggregate count, and last-attempt timestamp only.
- No visitor IP, user agent, email, content, notification preference, redirect target, or public response detail is stored or
  exposed.
- Public miss always returns original 404, including recognition/count errors. Unknown probes allocate no dedup entry or DB
  row and never increment ordinary views.
- Slug retirement and live-path cleanup share caller's DB transaction with create/update. Capture failure prevents update;
  database rollback covers later update failure.
- Cascading foreign keys remove records with owner/resume deletion. Private, deleted, expired, mismatched-owner, and renamed-
  username targets are ineligible.

Residual operational risk:

- Dedup is process-local, matching existing view-dedup behavior; multiple server instances can each count once per hour.
- Expiry/cap pruning is lazy on capture/list, not scheduled maintenance.
- The feature cannot recover historical links or username changes and intentionally does not reserve/redirect retired paths.

## Issue coverage

Partial, prospective coverage only: helps owners notice attempts to use slugs retired after deployment while username remains
current. It does not identify the historical source of issue #2836, recover old links, notify by email/push, redirect visitors,
or close the issue.

## Files

- `packages/db/src/schema/resume.ts`, `packages/db/src/schema/resume.test.ts`
- `migrations/20260906000441_green_hitman/{migration.sql,snapshot.json}`
- `packages/api/src/features/resume/{retired-links.ts,retired-links.test.ts,service.ts,service.test.ts,statistics.ts,statistics.test.ts}`
- `apps/web/src/routes/builder/$resumeId/-sidebar/right/sections/{statistics.tsx,statistics.test.tsx}`
- `apps/web/locales/en-US.po`
- `tests/e2e/{fixtures/db.ts,specs/retired-link-notices.spec.ts}`
- `docs/guides/sharing-your-resume-publicly.mdx`
