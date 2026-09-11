# Plan 27A remediation round 2

Date: 2026-09-06
Base: `ae8e2f76f`

## Focused fixes

- Removed multilingual markers from the fixture headline. Each marker now exists only in its dedicated summary paragraph.
- Added pure marker-location helpers. Marker lookup joins PDF text items, supports markers split across items, rejects duplicate occurrences, and rejects non-whitespace neighbors that could contaminate a local crop.
- Raster measurement still scans with antialiasing padding but counts ink only inside the marker box, preventing neighboring glyphs from making blank or tofu-like evidence pass.
- Browser PDF download now separates download errors from post-download evidence errors. A received download with failed rasterization is reported as `unresolved-raster-evidence-error` and fails the opt-in test rather than passing as a generic download error.
- Added focused pure tests covering duplicate, split, neighboring, blank, and tofu-like cases.
- Removed trailing spaces from `plan-27a-remediation.md`.

## Verification

- `pnpm exec vitest run tests/e2e/fixtures/offline-font-markers.test.ts` — 5/5 passed.
- `pnpm exec biome check tests/e2e/specs/offline-fonts.spec.ts tests/e2e/fixtures/offline-fonts.ts tests/e2e/fixtures/offline-font-markers.ts tests/e2e/fixtures/offline-font-markers.test.ts` — passed.
- `pnpm exec playwright test tests/e2e/specs/offline-fonts.spec.ts --list` — 4 tests collected.
- `git diff --check` — passed after remediation-document whitespace cleanup.

Full diagnostic E2E remains opt-in and was not run in this focused round. Server outbound request capture and verifiable restart identity remain explicit external host-level blockers; no production resolver changes were made.
