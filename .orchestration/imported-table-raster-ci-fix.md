# Imported-table raster CI fix

## Root cause

Hosted runs `34007560930` (PR #3471) and `34007788443` (PR #3472) failed only in
`tests/e2e/specs/imported-table.spec.ts` with `horizontal: 18` instead of Plan 16's
`horizontal: 17`; text and vertical checks passed.

The PDF operator dump from the failed hosted artifact showed 29 table path records matching the Plan 16 contract
(17 horizontal, 12 vertical), followed by an unrelated `constructPath` `endPath` bbox:
`[0, 19.65, 358.93, 20.65]`. Its stroke color was reported as `#cc00cc` only because the helper retained the
last table stroke color. It was a later red section-divider fill/no-paint path, not an extra table border. The old
helper classified every thin bbox after the last matching color state, so it counted this false positive.

The table's explicit width is stable at 300pt, while row height legitimately changes from 30pt to 31pt after the
`Beta!` edit. The helper therefore scopes candidate paths by the fixture's 300pt horizontal grid envelope, not by a
row-height tolerance. Missing or duplicated paths inside that envelope still change the exact 17/12 contract.

## Change

- Added `tests/e2e/fixtures/pdf-borders.ts` with deterministic `countTableBorderGeometry` filtering.
- Updated browser/server PDF inspection in `tests/e2e/specs/imported-table.spec.ts` to use the helper.
- Added `tests/e2e/fixtures/pdf-borders.test.ts`; regression proves old stale-color counting returns 2 horizontal
  paths while topology-scoped counting returns 1.

## Verification

- Intent skill inventory: 7 packages, 26 skills; no matching local skill for this E2E/PDF helper.
- Focused helper regression: 1 file, 1 passed.
- Dedicated imported-table E2E: 2 consecutive runs, each 1 passed; both exercise initial, unrelated-edit, and table-edit
  stages plus browser and server PDF exports.
- Production build: 3/3 tasks successful.
- Web typecheck via `rtk proxy pnpm --filter web typecheck`: passed (`tsgo --noEmit`).
- Turbo boundaries: 1,443 files across 20 packages, no issues.
- Targeted Biome: 3 files, no issues.
- `git diff --check`: passed.

The root `pnpm typecheck` wrapper was also tried but invokes an incompatible `tsc` path and reports TS5096 for
`allowImportingTsExtensions`; the package's documented `tsgo --noEmit` typecheck passes.
