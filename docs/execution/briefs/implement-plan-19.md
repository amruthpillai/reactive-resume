# Implement plan 19: scoped literal rich-text whitespace

Read approved plan 19 from local planning checkout only when HEAD equals
`a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d`; otherwise use
`git show a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d:plans/19-literal-rich-text-whitespace.md`. Read current `AGENTS.md`,
RTK, issue/domain guidance, ADRs, applicable TDD skills, and completed Plan 16 implementation/review reports. This unit must
start from or rebase onto reviewed Plan 16 head because both own rich editor/HTML seams; never implement concurrently. Run
root Intent inventory and load matching local skill before edits. Do not spawn subagents, touch ledger, mutate issues, merge,
push, or create PR.

Require clean dependent worktree, revalidate issue 3397/open PRs/current main and Plan 16 head, rename branch
`codex/issue-3397-literal-whitespace`, and record exact stacked base. Preserve paragraph indentation, Unicode-space fixes, and
table-cell support. Approved persisted marker is `data-resume-whitespace="preserve"`; unmarked legacy HTML must remain
unchanged. No global whitespace mode, NBSP substitution, code-block feature, or tab-key redesign.

Strict TDD, atomic web/PDF/DOCX contract:

- Record current GREEN characterization. Add failing marked paragraph/heading tests while existing unmarked ASCII collapse,
  pretty-printed import, Unicode spaces, indentation, lists, quotes, Enter/Shift+Enter, and table regressions remain green.
- Newly authored blocks and blocks receiving text-input/paste mark preservation; mount, prop update, and unmarked legacy import
  do not mark or emit saves. Exact leading/interior/trailing spaces and tab codepoints survive save/remount, undo/redo,
  paragraph↔heading, list transitions without data loss, marks, line breaks, RTL, and supported Plan 16 table cells.
- Scope editor display behavior to marked nodes. Preserve unsupported-content channel from Plan 16.
- PDF preserves only marked node-local whitespace. One tab adds exactly four ordinary-space advances; two add eight,
  independent of current x. Spaces remain breakable; narrow content never disappears. Do not disable dependency collapse
  globally; patch CJS/ESM and frozen install only if no smaller neutral adapter exists.
- DOCX emits preserved-space representation and the same logical four-space tab contract; verify XML plus rendered geometry
  when claiming visual width.
- Add synthetic authenticated E2E: type/paste, save/reload, JSON/PDF/DOCX export, exact codepoints and output geometry. No
  private content.

Run focused web/PDF/DOCX tests including Plan 16 table regressions, affected typechecks, boundaries, full build, E2E against
dedicated DB, narrow non-writing Biome, and diff/scope gates. Disclose/inspect any write-capable `pnpm check`. Commit locally;
no push/PR before independent review.

Write `.orchestration/plan-19-implementation.md`: exact dependency/base, live/drift state, facts vs uncertainty, RED/GREEN,
commit/files, tests/results, skipped visual/E2E gates, risks, issue coverage, PR `not created`. Final response at most ten lines.
