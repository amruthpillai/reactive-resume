# Implement plan 32: one-shot chronological section sort

Read approved plan 32 from local planning checkout only when HEAD equals
`a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d`; otherwise use
`git show a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d:plans/32-section-date-sorting.md`. Read current `AGENTS.md`, RTK,
issue/domain guidance, ADRs, and applicable brainstorming/TDD skills. Approved direction fixes behavior; do not ask routine
interaction questions. Run root Intent inventory and load matching local skill before edits. Do not spawn subagents, touch
ledger, mutate issues, merge, push, or create PR.

Start clean from refreshed `origin/main`, rename branch `codex/issue-2725-one-shot-sort`, revalidate live issue 2725 and open
PRs, and run exact drift. Ensure no active owner touches same section menus. Plan 24 is presentation-only; do not stack unless
current source truly requires its interface. This increment is one-shot Experience/Education only, not autosort or full issue
closure.

Strict TDD and contract:

- First characterize existing `parsePeriod` for numeric/localized/ongoing/year-only/reversed/blank/bare-Present/prose/equal
  values without changing parser or ATS behavior. Record nullable cases.
- Add failing tests for pure `sortSectionItemsByPeriod(items, locale): { items, unresolvedIds }` in `packages/resume` and
  an intentional public export. New array, original item objects/content/IDs unchanged, identical multiset, no input mutation.
- Total order: ongoing first by descending start; known-ended by descending end then start; stable ties. Mixed precision uses
  internal `[year, month ?? 0]`; never persists fabricated dates. Missing known endpoint ranks after known. Unresolved and
  reversed entries remain stable at end; return their exact IDs. Cover transitivity, determinism/repeat invocation,
  empty/single, localized months, year-only, bare Present, blank, prose, reversed, and stable equal ranges.
- Add existing-menu one-shot action only for built-in Experience/Education through one `useUpdateResumeData` draft mutation.
  One undo restores exact order; save/reload retains chosen order; later edits never resort. Locked state disables action.
  Concise Lingui notice identifies only affected entries in current section, preferably safe title or ID semantics supported by
  current notification patterns; do not expose unrelated resume content.
- No schema setting, persistent autosort, Date.parse, free-text rewrite, role/custom-section sort, or implicit render/save sort.

Record RED and GREEN. Run period/helper tests, focused web menu/undo tests, resume/web typechecks, boundaries, build, Lingui
catalog checks, and synthetic authenticated persistence E2E if feasible. Use narrow non-writing Biome; disclose/inspect any
write-capable `pnpm check`. Run diff/scope checks. Commit locally; no push/PR before independent review.

Write `.orchestration/plan-32-implementation.md`: live/drift state, facts vs uncertainty, RED/GREEN, exact commit/files,
tests/results, skipped gates, risks, partial issue coverage, PR `not created`. Final response at most ten lines.
