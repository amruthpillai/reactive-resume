# Implement plan 16: editable imported rich-text tables

Read entire approved plan from local planning checkout only when its HEAD equals
`a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d`; otherwise use pinned portable fallback:
`git show a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d:plans/16-imported-table-borders.md`. Read current `AGENTS.md`, RTK,
issue/domain instructions, ADRs, and applicable skills, including test-driven-development. Run root Intent inventory and load
matching local skill before source edits. Do not spawn subagents. Do not touch ledger, mutate issues, merge, push, or open PR.

Start from refreshed `origin/main`, require clean worktree, rename branch `codex/issue-3196-editable-tables`, revalidate live
issue 3196 and open PRs, and run exact drift check. Preserve merged #3438. Historical screenshot equivalence remains unverified
without source, but Q11 independently approves supported table editing.

Implement one atomic TDD unit across editor/HTML/PDF:

- Add failing `rich-input.table` tests first and record exact RED output: supported 2x3 table parses as structured Tiptap
  JSON; mount emits no change; named-cell edit affects one cell; undo/redo and remount retain rows/cells/text; HTML reimports
  equivalently. Include colspan/rowspan, multiple paragraphs, inline marks, paste, and unrelated prop updates.
- Register native Tiptap table/row/header/cell support with smallest required dependencies and frozen lockfile changes.
  Preserve supported widths/spans/borders and existing `emitUpdate: false` behavior.
- Detect unsupported structured markup before destructive normalization. Retain exact original HTML, expose accessible read-only
  notice, and prevent ordinary edits from overwriting it. Cover locked, keyboard, reopen, and cancellation behavior. Stop if
  implementation needs broader HTML security policy or arbitrary editor extensions.
- Keep explicit CSS precedence and borderless tables borderless. Legacy HTML `border` mapping is outside initial scope unless
  an exact fixture proves it is first failure; then stop and report fork rather than widening silently.
- Extend actual PDF integration: assert six cell coordinates plus exact horizontal/vertical border operators and fixed-DPI
  pixels for supported CSS borders in legacy/semantic modes. Unsupported fallback must remain lossless. Text-only assertion
  cannot pass.
- Add focused synthetic import E2E covering edit, undo/redo, save/reload, unrelated edit, browser/server PDF. No private data.

Run initial RED, focused web/PDF GREEN suites including existing #3438 test, web/PDF typechecks, boundaries, full build, and
plan E2E against dedicated disposable DB. Use narrow non-writing Biome; disclose/inspect any write-capable `pnpm check`.
Run `git diff --check` and scope inspection. Commit locally with normal message; no push/PR before independent review.

Write `.orchestration/plan-16-implementation.md`: verified facts vs uncertainty, live/drift state, exact RED/GREEN evidence,
dependency/lockfile changes, commit/files, commands/results, skipped gates, risks, historical issue limitation, PR `not
created`. Final response at most ten lines.
