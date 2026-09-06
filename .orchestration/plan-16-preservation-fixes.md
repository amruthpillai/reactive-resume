# Plan 16 preservation fixes

- Starting head: `d0cca949fcabda94d9291ab7a69a36c1ce11e4fd`
- Branch: `codex/issue-3196-editable-tables`
- Refreshed base: `origin/main` at `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec`
- Scope: only two P1 preservation gaps from `.orchestration/plan-16-final-rereview.md`

## Revalidation

- Fetched `origin/main`; base and merge base remained `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec`.
- Confirmed branch and exact starting head before edits. Initial worktree contained only the untracked final rereview report.
- Live issue #3196 remained open with `status: needs info`, `area: rendering`, no source fixture, and no linked closing PR.
- Rechecked open PRs #3453-#3461 by changed-file list. None overlapped the table editor, imported-table E2E, or PDF table integration product surfaces; #3455/#3456 only overlapped planning/execution documentation.
- Root Intent inventory exposed no matching editor, HTML, PDF, or Playwright package skill.

## Fixes

### Fail closed for every malformed table marker

`hasUnsupportedTableMarkup` now inventories opening and closing table markers independently from complete source-table
fragments and browser-parsed tables. Any marker set with zero complete source or parsed tables, any unmatched opening or
closing marker, mixed complete-plus-truncated markup, and browser-repaired source mismatch enters the existing read-only
preservation path.

This retains the original controlled value bytes, makes the editor non-editable, suppresses `onChange`, shows the existing
accessible preservation notice, and exposes no conversion affordance.

### Validate allowlisted values against configured semantics

The former name-only attribute/style allowlists are replaced by one declarative element-rule registry and one generic
validator. Rules cover tables, bodies, rows, cells, every allowed descendant, and every allowlisted attribute and style:

- table cell `align` accepts only Tiptap table values `left | center | right`;
- `colspan`/`rowspan` require canonical positive HTML spans, and `colwidth` requires finite positive canonical widths whose
  count matches the effective column span;
- paragraph/heading `data-indent` requires configured levels 1-8, is rejected inside lists, and any authored
  `margin-inline-start` must equal the configured `level * 24px`; physical `margin-left` remains unsupported;
- block/list `text-align`, ordered-list `start`, link URI protocols, text colors, highlight colors, and highlight
  source/style consistency are validated according to the installed/configured extensions;
- preserved table/row/cell CSS values use conservative CSSOM acceptance, with explicit handling for Tiptap-constrained
  alignment, border spacing, vertical alignment, and color values;
- unknown, ambiguous, malformed, empty-style, unsafe, or mutually inconsistent values fail closed.

Supported table editing remains active. New supported-semantic coverage exercises spans, colwidth, cell and block
alignment, indentation, links, text colors, light/dark highlights, ordered lists, table/row/cell CSS, user edits, and normal
`onChange` emission.

## Mutation-sensitive TDD evidence

Tests were written and observed failing before each implementation slice:

- Initial expanded matrix: 16 failures covering zero-table truncation and invalid table/row/cell/descendant values.
- Mixed complete table plus trailing `<table` and dangling `</table`: 2 focused failures before marker accounting.
- Tiptap-ignored zero-width whitespace in an unsafe link URI: 1 focused failure before conservative URI validation.

Final focused web result: 1 file, 34/34 tests passed. Every unsupported case uses the real controlled component and
asserts read-only state, accessible notice, absent conversion button, exact stored bytes, and zero `onChange` calls after
keyboard input, unrelated prop update, and two lock toggles.

## Verification

```text
Focused RichInput table suite: 1 file, 34/34 passed.
Broad web suite: 128 files, 835/835 passed.
Focused PDF rich-text table integration: 1 file, 11/11 passed.
Broad PDF suite: 77 files, 1004/1004 passed.
Web typecheck: exit 0.
PDF typecheck: exit 0.
Turbo boundaries: 1,411 files across 20 packages, no issues.
Narrow non-writing Biome: changed web files plus affected PDF/E2E/manifest surfaces, no fixes.
Production build: 3/3 tasks successful.
Current commit diff check: exit 0.
Authenticated imported-table Playwright: 1/1 passed in 18.1s.
```

The authenticated E2E used disposable database `reactive_resume_plan16_fix_d21a8f07917c`, isolated local storage, port
43217, and disabled optional S3 configuration. It registered a user, imported the table fixture, proved unrelated Basics
name persistence through database polling, `updated_at` advancement, reload, database reread, and UI reread, then edited
the table and verified browser/server PDF text plus 17 horizontal and 12 vertical magenta border operators. Database and
temporary storage were removed afterward.

An initial E2E launch failed before test execution because the disposable `ENCRYPTION_SECRET` was shorter than the
documented 32-character minimum; rerunning with a valid isolated secret passed. One parallel broad-test attempt exposed an
unrelated Combobox timing failure; the Combobox file passed 6/6 in isolation and the serial broad web rerun passed 835/835.
An optional Markdownlint invocation expanded through repository configuration and reported only the pre-existing
`.orchestration/plan-16-review.md:68` MD018 issue; this new report produced no diagnostic.
Full `origin/main...HEAD` whitespace checking likewise reports only two Markdown hard-break spaces in the pre-existing
`.orchestration/plan-16-review.md`; current commit adds none.

No PDF production code changed. Existing pixel/operator integration and authenticated export coverage re-confirm border
behavior before and after unrelated Basics and table edits.

## Final scope audit

Product/test changes are limited to `rich-input.tsx` and `rich-input.table.test.tsx`; reports are under `.orchestration/`.
No push, PR creation, issue edit, comment, label, or other GitHub mutation occurred.
