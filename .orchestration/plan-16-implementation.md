# Plan 16 implementation evidence

## Verified facts

- Planning checkout HEAD was `f4b16a9adb8721c1cd956a7bd3a2327f2c363e59`, not approved pin
  `a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d`; plan was read through pinned `git show` fallback.
- Refreshed `origin/main` and implementation base were both `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec`.
- Exact drift check over editor/PDF target paths returned no changes from `7a98f6662..HEAD` before implementation.
- Live issue #3196 remained open with `status: needs info`; comments still contained no source HTML/JSON fixture.
- Open PRs were #3453–#3459; none implemented imported table editing. Merged #3438 behavior remained covered.
- Branch was renamed to `codex/issue-3196-editable-tables`. No issue mutation, push, PR, merge, or ledger edit occurred.

## RED evidence

Command:

```text
rtk proxy pnpm --filter web exec vitest run src/components/input/rich-input.table.test.tsx
```

Result: exit 1, 1 failed file, 7 failed tests. First failure was exact table-loss boundary:

```text
AssertionError: expected 'paragraph' to be 'table'
Expected: "table"
Received: "paragraph"
```

Named-cell and paste cases received empty table matrices; unsupported fallback cases could not find `role="status"`.
Before editor changes, existing PDF/#3438 integration passed: 1 file, 7 tests.

## Implementation

- Registered Tiptap `Table`, `TableRow`, `TableHeader`, and `TableCell` nodes.
- Preserved bounded table/row/cell width, spacing, padding, alignment, and border declarations plus native spans.
- Kept raw style declaration order so explicit CSS precedence survives; no default border is introduced.
- Classified legacy `border`, captions, column groups, head/foot groups, and unapproved table attributes/styles as unsupported.
- Unsupported imported tables stay read-only with accessible status copy; ordinary updates cannot emit normalized content.
- Explicit plain-text conversion requires confirmation; cancellation preserves original value and decision can reopen.
- Kept external `setContent(..., { emitUpdate: false })` behavior.

## Dependency and lockfile

- Added exact-compatible `@tiptap/extension-table` specifier `^3.31.2` to `apps/web/package.json`.
- Lockfile adds only 14 lines for importer, package resolution, and snapshot; incidental resolver refreshes were removed.
- `pnpm install --frozen-lockfile` passed.

## GREEN evidence

```text
web rich-input.table + rich-input.indent: 2 files, 31 tests passed
PDF rich-text-table integration: 1 file, 11 tests passed
web typecheck: exit 0
PDF typecheck: exit 0
turbo boundaries: 1080 files in 20 packages, no issues
full pnpm build: 3 tasks successful
narrow Biome check: 5 files checked, no fixes applied
git diff --check: exit 0
```

PDF assertions cover six literal cell coordinates, exact PDF.js path counts (`17` horizontal, `12` vertical), and
fixed-DPI magenta pixels (`1851`) in both legacy and semantic modes for original, unrelated-edit, and table-edit stages.
Borderless fixtures assert zero border paths and zero magenta pixels.

Dedicated Playwright acceptance used database `reactive_resume_plan16_task_f3d05a6ebb86`, port 43196, and isolated local
storage. First launch could not satisfy health because `.env.local` enabled unavailable optional S3; rerun explicitly unset
S3 variables and passed 1/1 in 16.8 seconds. Test imports synthetic JSON through dashboard, checks 2x3 editor DOM,
undo/redo, save/reload, unrelated edit, preview pixels, browser PDF, and public/server PDF. Database and local storage were
deleted after the run.

## Files and commit

- `.orchestration/plan-16-implementation.md`
- `apps/web/package.json`
- `apps/web/src/components/input/rich-input.tsx`
- `apps/web/src/components/input/rich-input.table.test.tsx`
- `packages/pdf/src/semantic/rich-text-table.integration.test.tsx`
- `pnpm-lock.yaml`
- `tests/e2e/specs/imported-table.spec.ts`

Local commit message: `fix(web): preserve imported rich-text tables`.

## Uncertainty, skipped gates, and risks

- Historical screenshot equivalence remains unverified because reporter supplied no exact source fixture.
- Legacy HTML `border` mapping remains outside scope; such tables use lossless read-only fallback.
- Unsupported-table detection intentionally uses narrow structural/style allowlists; additional table features require an
  explicit product/security decision instead of silent normalization.
- Full write-capable `pnpm check` was not run. Narrow non-writing Biome passed, avoiding unrelated repository rewrites.
- Independent review was not available in this dispatched run. PR not created.
