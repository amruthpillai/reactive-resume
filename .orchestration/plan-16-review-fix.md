# Plan 16 independent-review fixes

## Source and drift

- Work started from required exact HEAD `83aca184e4eeb3a9ded36c1f222adf695ef6ca98` on
  `codex/issue-3196-editable-tables` in an existing linked Orca worktree.
- `origin/main` refreshed to `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec`; merge-base remained that commit.
- Live issue #3196 remained open with `status: needs info` and no exact HTML/JSON fixture. Historical screenshot equivalence
  therefore remains unverified.
- Open PRs #3453-#3461 were inspected. None overlapped RichInput table handling, imported-table E2E, or PDF table tests;
  #3461 touched separate shared picture styling.
- Root Intent inventory found no matching editor, HTML, PDF, or Playwright skill. No Intent package skill was loaded.

## Findings resolved

1. Unsupported-table detection now fails closed before any editor update can replace source bytes. It compares raw table
   fragments with browser-parsed table markup to detect repair, requires one representable `tbody`, validates table/row/cell
   attributes and style properties, and recursively restricts cell content to configured Tiptap block/inline grammar.
   Nested `section[aria-label]`, multiple `tbody` groups, malformed/repaired markup, and unsupported descendant attributes
   are read-only. Controlled-state tests prove keyboard input, lock toggles, and unrelated prop updates cannot change exact
   stored HTML bytes.
2. Unsafe conversion was removed rather than redefined. During execution, coordinator clarified that pinned Plan 16's
   approved direction controls: destructive conversion UX is outside this repair, no conversion decision is required, and
   unsupported content must remain exact-byte read-only. `Convert to editable text`, ignored `usePrompt` value, and all
   destructive affordances are gone. Supported tables remain natively editable.
3. Authenticated E2E now separates publication from reads, returns `basics.name` plus `updated_at`, polls until changed name is
   persisted, asserts timestamp advanced, reloads, and verifies both database value and Basics input before any table
   assertion. It no longer accepts a stale pre-existing `Saved` label as proof.

## TDD evidence

Component RED:

```text
pnpm --filter web exec vitest run src/components/input/rich-input.table.test.tsx
1 file failed; 5 failed, 5 passed.
Legacy fixture failed because conversion button still existed.
Section, multiple-tbody, repaired-markup, and descendant-attribute fixtures failed because preservation notice was absent.
```

Component GREEN:

```text
pnpm --filter web exec vitest run src/components/input/rich-input.table.test.tsx
1 file passed; 10 passed.
```

E2E assertion mutation RED replaced expected reloaded Basics name with `stale pre-existing value`. Dedicated E2E failed at
that exact assertion, receiving `Imported Table Probe unrelated edit`; assertion was restored before GREEN.

## Verification

```text
Focused web table + indentation: 2 files, 34 tests passed.
Focused PDF table integration: 1 file, 11 tests passed.
Broad web: 128 files, 811 tests passed.
Broad PDF: 77 files, 1004 tests passed when run alone.
Web typecheck: exit 0.
PDF typecheck: exit 0.
Turbo boundaries: 1,411 files across 20 packages, no issues.
Frozen install: already up to date, exit 0.
Production build: 3/3 tasks successful.
Narrow non-writing Biome: 3 implementation/test files checked, no fixes.
Dedicated authenticated Playwright: 1/1 passed on port 43206.
```

Initial broad PDF run overlapped broad web and timed out in two unrelated 5-second tests. Immediate isolated rerun passed all
77 files and 1,004 tests; no timeout or production adjustment was made. Playwright used disposable database
`reactive_resume_plan16_fix_7b736863`, temporary local storage, and disabled optional S3; both database and storage were
removed afterward.

## Scope and remaining limits

- No dependency, lockfile, PDF production, CSS, schema, or package-boundary change was needed. Existing #3438 tests, PDF
  border operators/pixels, supported 2x3 editing/paste/undo/redo/persistence, and borderless behavior remain covered by
  focused and broad suites.
- Detection is intentionally conservative. Unfamiliar but valid HTML becomes read-only instead of risking normalization;
  broader HTML support requires separate product/security approval.
- Full write-capable `pnpm check` was not run. Narrow non-writing Biome was used to avoid unrelated rewrites.
- No issue/PR mutation, push, publish, merge, or ledger edit occurred. PR not created.
