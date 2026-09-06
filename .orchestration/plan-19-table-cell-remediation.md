# Plan 19 table-cell remediation evidence

Date: 2026-09-06

## Scope

Focused rereview finding: supported clipboard tables with direct text in `td`/`th` cells lost authored leading/trailing spaces and tabs before the existing marker pass. Complex-table fail-closed validation must remain unchanged.

Current `origin/main` was fetched and revalidated at `744eaa902` (`feat(sharing): serve a configured public resume at root (#3470)`). Work remains on existing branch `codex/issue-3397-literal-whitespace`; no rebase, push, or PR was performed.

## Fix

`apps/web/src/components/input/rich-input-whitespace.ts` now recurses into `td`/`th` descendants when normalizing a supported table. Existing direct inline/text runs are converted into marked paragraphs before ProseMirror parses them, preserving table structure and exact authored spaces/tabs. Existing `hasUnsupportedTableMarkup` validation still runs on original clipboard HTML before normalization, so unsupported or malformed complex tables continue to reject.

## Regression coverage

Added parameterized `td` and `th` paste cases to `apps/web/src/components/input/rich-input.whitespace.test.tsx`. Each case pastes `<table><tbody><tr><td|th>  Cell\ttext  </...>` and asserts marked output plus exact text codepoints.

TDD evidence: new tests failed before the production change with output `<p data-resume-whitespace="preserve">Cell text</p>`; after the change both cases pass with authored edge spaces and tab intact.

## Verification

- `rtk proxy pnpm --filter web exec vitest run src/components/input/rich-input.whitespace.test.tsx src/components/input/rich-input.indent.test.tsx src/components/input/rich-input.table.test.tsx` — 3 files, 102 tests passed.
- `rtk proxy pnpm --filter web run typecheck` — passed.
- `rtk proxy pnpm exec biome check apps/web/src/components/input/rich-input-whitespace.ts apps/web/src/components/input/rich-input.whitespace.test.tsx` — passed; no fixes.
- `rtk git diff --check` — passed.

The focused table suite includes existing unsupported/malformed/complex table rejection cases; all passed alongside the new TD/TH cases.
