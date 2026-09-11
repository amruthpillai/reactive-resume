# Implement plan 23A: authored-page versus overflow guidance

Read approved plan 23 from local planning checkout only when HEAD equals
`a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d`; otherwise use
`git show a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d:plans/23-pagination-controls.md`. Read current `AGENTS.md`, RTK,
issue/domain guidance, ADRs, and applicable brainstorming/TDD/frontend skills. Plan and Q10 supply approved direction; do not
pause for routine wording/layout choices. Run root Intent inventory and load matching local skill before edits. Do not spawn
subagents, touch ledger, mutate issues, merge, push, or create PR.

Start clean from refreshed `origin/main`, rename branch `codex/issue-3090-authored-page-guidance`, revalidate issues 3090 and
3350 plus open PRs, and run plan drift check. This is only 23A/Q10 guidance for issue 3090. Do not add item keep-together,
widow/orphan controls, renderer-generated page records, schema changes, or claim issue 3350 fixed.

TDD and bounded implementation:

- Add failing Layout UI test with one authored page and multiple physical-render-page evidence/stub. Guidance must identify
  authored pages versus automatic PDF overflow, name existing `Move to` → `New Page` and full-width controls accurately, and
  make clear physical overflow pages are not separately saved/editable.
- Add concise, accessible guidance at owning Layout pages surface using existing UI primitives and Lingui strings. Link or
  focus existing controls only if current component contracts support it without new state. Preserve existing warning and
  avoid duplicative copy.
- Prove rendering guidance does not mutate `metadata.layout.pages`, add page records, change section assignment, or alter PDF
  behavior. Cover keyboard/accessibility and locked state where relevant.
- Extend synthetic Azurill case: automatic overflow retains all content; manually authored second full-width page remains an
  independent saved layout choice. Do not promise independent styling of physical overflow.

Record initial RED then GREEN. Run focused Layout/page tests, relevant PDF pagination regression if touched by test harness,
web typecheck, boundaries, full build, focused E2E if existing infrastructure can observe guidance without private data,
Lingui extraction/catalog checks, narrow non-writing Biome, `git diff --check`, and scope review. Commit locally; no push/PR
before independent review.

Write `.orchestration/plan-23a-implementation.md`: live/drift state, facts vs uncertainty, RED/GREEN, exact commit/files,
tests/results, skipped gates, risks, partial issue coverage, PR `not created`. Final response at most ten lines.
