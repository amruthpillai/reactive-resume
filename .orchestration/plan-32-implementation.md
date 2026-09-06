# Plan 32 implementation report

## Outcome

Implemented one-shot chronological sorting for built-in Experience and Education sections. Sorting is explicit, locale-aware, stable, undoable, persisted through normal resume saves, disabled for locked resumes, and never reruns after later field edits. Pull request was **not created**.

Implementation commit: `3e9d57174067d19a9ce3ee46a26780a26a3d0fe2` (`feat(builder): add one-shot section date sorting`).

## Live and drift state

- Refreshed base: `origin/main` at `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec`; implementation started from that clean commit.
- Branch renamed to `codex/issue-2725-one-shot-sort`.
- GitHub issue `amruthpillai/reactive-resume#2725` was open, labeled `needs triage`, and assigned to `amruthpillai` when revalidated. Its broader request still includes automatic/manual behavior beyond this increment.
- Open pull-request search found no competing section-sorting implementation.
- Orca worktree/dispatch inspection found no active owner modifying the same section menu.
- Exact planned-path drift against refreshed base was empty.
- Plan 24 was not stacked; current source did not require its presentation interface.
- Root Intent inventory returned seven packages and 26 skills; none matched this sorter/menu concern, so no local Intent skill was loaded.

## Implemented contract

- Added public `@reactive-resume/resume/section-sort` export with pure `sortSectionItemsByPeriod(items, locale)`.
- Order is ongoing by descending start, then ended by descending end and start, then stable unresolved/reversed entries.
- Mixed precision compares `[year, month ?? 0]` in memory only. Missing endpoints follow known endpoints. Input arrays and item objects remain unchanged.
- Existing Experience/Education menu now exposes `Sort by date`; one click performs one resume draft mutation.
- Warning names only unresolved entries from current section using company/school, falling back to item ID.
- No schema setting, autosort, `Date.parse`, period rewrite, role sorting, custom-section sorting, render-time sorting, or save-time sorting was added.

## RED / GREEN evidence

### Characterization

Existing `parsePeriod` behavior was characterized first for numeric, French-localized, ongoing, year-only, reversed, blank, bare `Present`, prose, and equal values. Nullable cases are blank, bare ongoing token, and prose; reversed ranges parse but are rejected by sorter. Parser implementation and ATS behavior were not changed. Characterization suite passed with 67 tests.

### RED

- New helper contract tests failed because `./section-sort` did not exist (`Cannot find module './section-sort'`). Existing period characterization remained green.
- New menu tests failed to find `Sort by date` for Experience/Education/locked scenarios. Existing non-eligible-section exclusion remained green.

### GREEN

- Period plus helper suites: 75 tests passed across two files.
- Section-menu suite: six tests passed.
- Focused section-menu plus draft-store suites: 25 tests passed.
- Authenticated PostgreSQL browser E2E: one test passed in 13.6 seconds (10.6-second test body), covering sort, targeted notice, persisted order, undo, reload, no later resort, and locking.

Two initial E2E attempts exposed harness-only issues: port 3000 was occupied/S3 health required SeaweedFS, then broad `Undo` and item locators were ambiguous. The run moved to port 3017 with required local services and exact/scoped locators; production code did not change for those failures.

## Verification

- `pnpm test`: exit 0; 19/19 Turbo tasks successful. Changed resume suite reported 30 files and 1,369 tests passing.
- `pnpm --filter @reactive-resume/resume typecheck`: exit 0.
- `pnpm --filter web typecheck`: exit 0.
- `pnpm exec turbo boundaries`: exit 0; 1,467 files checked, no issues.
- `pnpm build`: exit 0; 3/3 tasks successful.
- `pnpm --filter web exec lingui compile`: exit 0.
- Narrow non-writing Biome check over eight changed TS/TSX/JSON files: exit 0, no fixes applied.
- `git diff --check` and staged diff check: exit 0.
- Locale scope inspection: all 55 catalogs contain only two new messages from this change; `en-US` has source strings and 54 non-source catalogs have empty translations.
- Write-capable `pnpm check` was intentionally not run; required narrow non-writing Biome check was used instead.

## Exact implementation files

- `packages/resume/package.json`
- `packages/resume/src/ats/period.test.ts`
- `packages/resume/src/section-sort.ts`
- `packages/resume/src/section-sort.test.ts`
- `apps/web/src/features/resume/builder/draft.test.ts`
- `apps/web/src/routes/builder/$resumeId/-sidebar/left/shared/section-menu.tsx`
- `apps/web/src/routes/builder/$resumeId/-sidebar/left/shared/section-menu.test.tsx`
- `tests/e2e/specs/section-date-sorting.spec.ts`
- Locale catalogs: `af-ZA.po`, `am-ET.po`, `ar-SA.po`, `az-AZ.po`, `bg-BG.po`, `bn-BD.po`, `ca-ES.po`, `cs-CZ.po`, `da-DK.po`, `de-DE.po`, `el-GR.po`, `en-GB.po`, `en-US.po`, `es-ES.po`, `fa-IR.po`, `fi-FI.po`, `fr-FR.po`, `he-IL.po`, `hi-IN.po`, `hu-HU.po`, `id-ID.po`, `it-IT.po`, `ja-JP.po`, `km-KH.po`, `kn-IN.po`, `ko-KR.po`, `lt-LT.po`, `lv-LV.po`, `ml-IN.po`, `mr-IN.po`, `ms-MY.po`, `ne-NP.po`, `nl-NL.po`, `no-NO.po`, `or-IN.po`, `pl-PL.po`, `pt-BR.po`, `pt-PT.po`, `ro-RO.po`, `ru-RU.po`, `sk-SK.po`, `sl-SI.po`, `sq-AL.po`, `sr-SP.po`, `sv-SE.po`, `ta-IN.po`, `te-IN.po`, `th-TH.po`, `tr-TR.po`, `uk-UA.po`, `uz-UZ.po`, `vi-VN.po`, `zh-CN.po`, `zh-TW.po`, `zu-ZA.po` under `apps/web/locales/`.

## Facts, uncertainty, and risks

Facts: helper preserves references and content, stable ties, exact unresolved IDs, deterministic repeat calls, empty/single inputs, localized months, mixed precision, and reversed-range handling through direct tests. Store tests prove one undo entry and exact authored-order restoration; store and E2E tests prove persistence and absence of implicit resorting.

Remaining uncertainty/risk: arbitrary free-text periods outside existing parser grammar remain unresolved by design. Non-source translations remain empty pending localization. Full authenticated E2E exercises Experience; Education and locked menu-item state have focused component coverage. Local PostgreSQL and SeaweedFS services used for E2E remain running.

## Skipped gates and issue coverage

- Independent subagent review was not run because dispatch brief explicitly prohibited subagents. Coordinator review remains required before any push or PR.
- No issue mutation, merge, push, or PR creation occurred.
- This closes only approved one-shot Experience/Education increment. Automatic sorting, persistent sort preferences/toggles, roles, custom sections, and full issue closure remain out of scope.
- PR: `not created`.
