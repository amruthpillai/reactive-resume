# Plan 16 final independent rereview

- Exact head reviewed: `d0cca949fcabda94d9291ab7a69a36c1ce11e4fd`
- Base refreshed: `origin/main` at `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec`
- Merge base: `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec`
- Verdict: **CHANGES REQUIRED — DO NOT PUBLISH**

## Standards

No actionable documented-standard breach was found. Product changes stay in the approved web, PDF-test, dependency, and
root E2E surfaces; workspace imports use package exports; the React component retains a named props type; boundaries and
non-writing Biome checks pass.

The manual table grammar in `rich-input.tsx` duplicates knowledge held by Tiptap's node and attribute parsers. This is a
possible **Duplicated Code / Divergent Change** smell (judgement call, not a documented-standard violation): attribute names
can be added to the local allowlist without matching Tiptap's accepted values or serialization behavior. The second Spec
finding demonstrates the resulting drift.

## Spec

### [P1] Truncated table markup with no parsed table fails open and can be overwritten

Anchor: `apps/web/src/components/input/rich-input.tsx:209-213`; missing case beside
`apps/web/src/components/input/rich-input.table.test.tsx:21-36`

The guard notices any `"<table"` substring, but `parsedTablesMatchSource` treats two empty collections as a match. For the
malformed imported value `<table`, `DOMParser` returns zero tables and the complete-table regex returns zero source
fragments, so the guard reaches an empty loop and returns `false`. A current-extension runtime probe produced editor HTML
`<p></p>` for that input. The editor therefore remains editable, and the first ordinary edit emits normalized HTML through
`onUpdate`, replacing the original malformed bytes.

This violates the pinned requirement to fail closed and preserve exact authored HTML when structured markup cannot round
trip. Existing malformed coverage uses `<table><tbody><tr><td>Broken</tr></tbody></table>`, which the browser repairs into a
parsed table and therefore exercises only the non-empty mismatch branch. Treat a table marker with no complete, parsed
table as unsupported and add truncated/open-tag variants to the exact-byte/no-`onChange` matrix.

### [P1] Attribute names are allowlisted without validating values that Tiptap drops or rewrites

Anchor: `apps/web/src/components/input/rich-input.tsx:230-237`

Cells are considered supported when their attribute *names* are among `colspan`, `rowspan`, `colwidth`, `align`, and
`style`; values are not checked against Tiptap's parser. Two current-extension probes pass every structural/name check yet
serialize differently before any user content change:

```text
input:  <td align="justify">X</td>
output: <td colspan="1" rowspan="1"><p>X</p></td>

input:  <td colwidth="bogus">X</td>
output: <td colspan="1" rowspan="1" colwidth="NaN"><p>X</p></td>
```

`align="justify"` is outside the installed table extension's accepted `left | right | center` values and disappears;
`colwidth="bogus"` is parsed as a non-number and rewritten to `NaN`. Because `hasUnsupportedTableMarkup` returns `false`,
the first ordinary edit publishes this normalized document and irreversibly replaces source bytes. The same value-level
risk exists for locally allowed descendant attributes/styles such as invalid or inconsistent `data-indent` values.

This violates the preservation fallback for markup that cannot round trip. Validate allowed attribute/style values against
the configured extensions (including span/width and indent constraints), then add exact-byte read-only regressions for
invalid `align`, `colwidth`, span, and descendant style/indent values.

## Requirements confirmed

- Unsupported descendants and attributes, multiple `tbody` groups, browser-repaired non-empty malformed markup, and legacy
  `border="1"` tables are read-only in current focused coverage; keyboard attempts, lock toggles, and unrelated prop updates
  do not call `onChange` and retain the controlled source bytes.
- Unsupported content exposes only an accessible preservation notice. No conversion action or decision UI remains.
- Supported 2x3 tables parse as table nodes, allow named-cell edits and supported paste, preserve spans/styles/paragraphs/
  marks, and retain structure through undo, redo, remount, persistence, and reload.
- PDF coverage verifies six cell coordinates plus color-specific path counts and fixed-DPI pixels in legacy and semantic
  modes before/after unrelated and table edits. Borderless controls remain at zero; browser and server PDF E2E assertions
  both pass. No production PDF renderer change exists in this diff.
- Authenticated E2E polls persisted `basics.name`, proves `updated_at` advanced, reloads, then rechecks both database and
  Basics input before asserting table bytes and exports. This is sufficient unrelated-Basics persistence proof.
- Historical equivalence to issue #3196 remains unverified because no exact HTML/JSON fixture or app build was added. This
  matches the plan's explicit limitation and does not justify issue closure or legacy `border` mapping.

## Source, issue, and overlap revalidation

- `git fetch origin main` left `origin/main` at `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec`; HEAD and reviewed commit both
  resolve exactly to `d0cca949fcabda94d9291ab7a69a36c1ce11e4fd`.
- Full `origin/main...HEAD` diff contains nine files: three orchestration evidence reports, web dependency/lock changes,
  `rich-input.tsx`, its table test, the existing PDF integration test, and one E2E spec. Product diff is 788 added and 18
  deleted lines; complete diff and both commits were inspected.
- Live issue #3196 remains open with `status: needs info`, `area: rendering`, and no source fixture or closing PR. Merged PR
  #3438 remains in the base; its semantic-tree behavior is unchanged and its table integration cases remain in the expanded
  passing suite.
- Open PRs #3453-#3461 were inspected by changed-file list. None overlaps the changed product files for editor table
  handling, PDF table integration, or imported-table E2E; #3455/#3456 overlap planning/execution documentation only.
- Root Intent inventory exposed no matching editor, HTML, PDF, or Playwright skill, so no package skill was loaded.

## Fresh verification

```text
pnpm install --frozen-lockfile: exit 0, lockfile already current.
Focused web table + indentation: 2 files, 34/34 tests passed.
Focused PDF table integration: 1 file, 11/11 tests passed.
Broad web: 128 files, 811/811 tests passed.
Broad PDF: 77 files, 1004/1004 tests passed.
Web typecheck: exit 0.
PDF typecheck: exit 0.
Turbo boundaries: 1,411 files across 20 packages, no issues.
Narrow non-writing Biome: 5 changed source/manifest files checked, no fixes.
Production build: 3/3 tasks successful; post-build tracked diff unchanged.
git diff --check origin/main...HEAD: exit 0.
Dedicated authenticated Playwright: 1/1 passed in 21.4s on port 43207.
```

Playwright used disposable database `reactive_resume_plan16_final_fac7a8d1`, isolated temporary local storage, and disabled
optional S3 variables. Database and storage were removed afterward. Server logged existing `borderCollapse` unsupported-
style warnings, but required preview pixels and browser/server PDF border operators passed.

Mutation-sensitive runtime probing used the exact installed Tiptap `3.31.2` extensions and the current `StyledTable*`
attribute/render setup without editing repository source. It confirmed both findings: zero parsed/regex tables for `<table`
are treated as a successful source match, invalid `align` disappears, and invalid `colwidth` becomes `NaN`.

An initial RTK-wrapped filtered typecheck attempt was rejected as evidence: RTK warned that the filter was unsupported,
invoked emitting `tsc`, and generated untracked JavaScript. All generated files were removed from the previously clean
worktree, then typechecks and boundaries were rerun through `rtk proxy` with the correct commands and passed. Final source
worktree state before this report contained no modifications or untracked files.

Summary: Standards 0 actionable findings (1 architecture smell noted); Spec 2 P1 findings. Worst Standards issue: none.
Worst Spec issue: fail-open unsupported-table classification permits silent source-byte replacement on first edit.
