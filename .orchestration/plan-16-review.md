# Plan 16 independent review

Exact head reviewed: `83aca184e4eeb3a9ded36c1f222adf695ef6ca98`  
Base refreshed: `origin/main` at `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec`  
Verdict: **CHANGES REQUIRED — DO NOT PUBLISH**

## Findings

### [P1] Unsupported descendants inside otherwise allowed cells bypass preservation fallback

Anchor: `apps/web/src/components/input/rich-input.tsx:130-153`

`hasUnsupportedTableMarkup` rejects selected table-group tags and validates attributes/styles only on `table`, `tbody`,
`tr`, `td`, and `th`. It never verifies cell descendant elements or their attributes against Tiptap schema. Valid imported
HTML such as:

```html
<table><tbody><tr><td><section aria-label="keep">Inside</section></td></tr></tbody></table>
```

is therefore classified editable. Actual Tiptap parse/serialize at reviewed head produces:

```html
<table><tbody><tr><td colspan="1" rowspan="1"><p>Inside</p></td></tr></tbody></table>
```

First ordinary edit emits normalized whole document through `onChange` at lines 270-273, silently deleting `section` and
`aria-label`. Same gap applies to other unrepresented valid structures, including multiple `tbody` groups, and malformed
table source repaired by `DOMParser` before classification. This violates approved requirement to detect markup that cannot
round-trip before destructive editor normalization and preserve exact original HTML. Add descendant/schema round-trip
classification (or a conservative supported grammar) plus regression proving edit attempts cannot overwrite original bytes.

### [P2] Confirmed “editable text” conversion is neither plain-text nor verified

Anchors: `apps/web/src/components/input/rich-input.tsx:290-297`,
`apps/web/src/components/input/rich-input.table.test.tsx:172-183`

Conversion calls `onChange(editor.getHTML())`, so it commits Tiptap's already-normalized table document rather than a defined
plain-text conversion. For current `border="1"` fixture result remains a table; for a caption fixture, Tiptap converts caption
text into an extra table row. UI also uses `usePrompt`, displaying an irrelevant blank text input whose value is ignored,
instead of boolean confirmation. Tests cover cancellation twice but never successful confirmation/output. Define expected
conversion result, use confirmation UI matching action, and assert confirmed output plus subsequent editable/reopen state.

### [P2] E2E does not prove unrelated edit persisted

Anchor: `tests/e2e/specs/imported-table.spec.ts:153-161`

Test fills Basics name, waits for a generic existing `Saved` status, reloads, then checks only summary table HTML. Database
helper does not return Basics name, so test can pass if unrelated change never saves. Assert save transition or persisted
Basics value after reload before claiming unrelated-edit coverage.

## Standards

No actionable documented-standard violation found. Changes remain within approved web/PDF/E2E ownership, use package
exports, preserve named prop types, pass non-writing Biome, and pass executable boundaries. Repeated synthetic fixture and
border-counter code across package integration and root E2E tests is possible **Duplicated Code** (judgement call), but
separate runtime resolution and test ownership make extraction lower value than local independence.

`.orchestration/plan-16-implementation.md` in product commit is intentional: implementation brief explicitly required this
evidence artifact. No scope-hygiene finding recorded for its presence.

## Spec

Supported 2x3 parsing, no mount emission, named-cell edit, supported paste, undo/redo, save/reload, inline styles, spans,
paragraphs/marks, no-op external updates, locked/read-only/cancel paths, CSS declaration order, borderless behavior, six PDF
coordinates, exact border operators, fixed-scale pixels, browser/server PDF, and #3438 cases are covered and green. Findings
above leave unsupported preservation and explicit conversion incomplete; unrelated-edit E2E proof is partial. Historical
#3196 screenshot equivalence remains unverified because live issue still contains no source HTML/JSON fixture.

## Review evidence

- Live issue #3196: open; labels include `status: needs info`; no source fixture added.
- Merged #3438 read and compared: semantic-tree production fix unchanged; its seven prior cases remain in expanded suite.
- Open PRs #3453-#3460 inspected: no overlap with changed editor/PDF/imported-table paths.
- RED sanity by source/diff: base `rich-input.tsx` has no table extensions or unsupported fallback, consistent with recorded
  7/7 RED output (`table` parsed as `paragraph`; status absent). Existing pre-change #3438 PDF suite was separately green.
- Dependency: only `@tiptap/extension-table@3.31.2`; 14 lockfile lines; peers exactly 3.31.2; MIT; frozen install passed.
- Focused web table/indent: 31/31 passed.
- Focused PDF table integration: 11/11 passed.
- Broader web: 128 files, 808/808 passed.
- Broader PDF: 77 files, 1004/1004 passed.
- Web and PDF typechecks passed.
- `turbo boundaries`: 1,411 files across 20 packages, no issues.
- Full build passed: 3/3 tasks.
- Narrow non-writing Biome: 4 files checked, no fixes.
- `git diff --check`, exact head, scope allowlist, and product-tree checks passed; only this mandated review artifact is
  untracked after review.
- Dedicated Playwright E2E: 1/1 passed on port 43197 with database
  `reactive_resume_plan16_review_e52d01c` and temporary local storage; database and storage cleaned afterward.

Summary: Standards 0 actionable findings (1 low-value smell noted); Spec 3 findings. Worst Standards issue: none. Worst Spec
issue: P1 preservation bypass causing silent loss of unsupported cell descendants on ordinary edit.
