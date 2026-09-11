# Independent review: Plan 16 editable imported tables

Review only in `/Users/amruth/orca/workspaces/reactive-resume/issue-3196-editable-tables`.
Exact target head: `83aca184e`. Do not edit tracked files, commit, push, publish, merge, or mutate issues.

Read current instructions, pinned approved Plan 16, implementation report, full `origin/main...HEAD` diff, live issue
issue #3196, merged #3438, open PR overlap, and relevant editor/PDF/import domain docs. Refresh base and verify exact head.
Run root Intent inventory and load matching review skill if any; no subagents.

Review Standards and Spec. Independently verify:

- supported 2x3 tables parse as structured Tiptap nodes; mount and unrelated prop updates emit no destructive change;
- named-cell edit, paste, spans, multiple paragraphs, inline marks, undo/redo, save/reload, and HTML round-trip remain lossless;
- unsupported markup is detected before normalization, exact original HTML is preserved, accessible read-only notice works,
  ordinary/locked/keyboard/reopen/cancel flows cannot overwrite it, and confirmed plain-text conversion is explicit;
- CSS declaration precedence, widths/spans/borders and borderless behavior hold without unsafe HTML widening;
- PDF tests prove six cell coordinates, exact border operators, and fixed-DPI pixels in legacy/semantic modes;
- synthetic import E2E covers editor persistence, unrelated edit, browser/server PDF and cleanup;
- Tiptap dependency/lockfile delta is minimal, compatible, licensed, and boundary-safe;
- no regression to #3438, non-table rich input, SSR, accessibility, or package ownership;
- `.orchestration/plan-16-implementation.md` presence in product commit is intentional or report as scope hygiene finding.

Run RED-evidence sanity review; focused table/indent/PDF suites plus broader affected web/PDF tests, typechecks, boundaries,
frozen install, build, narrow non-writing Biome, diff/scope gates, and dedicated DB/local-storage E2E. Report findings first
with severity/anchors and publication verdict in `.orchestration/plan-16-review.md`; send worker_done.
