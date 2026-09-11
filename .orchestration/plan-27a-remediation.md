# Plan 27A remediation

Date: 2026-09-06
Base: `61b58ae9a`
Scope: concrete findings from `.orchestration/plan-27a-independent-review.md` only.

## Remediated findings

- Builder PDF preview and browser PDF download now produce raster evidence. The fixture stores each multilingual marker in its own summary paragraph, allowing the diagnostic to locate marker-local PDF text boxes and measure only those raster crops. Reports attach a rendered PNG plus per-marker `inkPixels`, trimmed dimensions, and status. Blank and tofu-like crops fail assertions; no whole-page snapshot is used.
- PDF text extraction is reported separately as `textLayerMarkers`. It is not described or asserted as proof of visible glyph outlines.
- Server PDF output remains text-extraction-only and is explicitly classified as `serverGateStatus: unresolved-external-host-level-blocker`. `serverRestartFlag` is caller input, not restart proof. Browser Playwright routing is not used to infer server egress, and no production resolver or instrumentation behavior was added.
- `.orchestration/plan-27a-diagnostic.md` now records a fresh boundaries pass and the corrected `87,490,700 bytes (~83.44 MiB)` arithmetic.
- Diagnostic remains opt-in through `OFFLINE_FONT_DIAGNOSTIC=1`; normal CI behavior remains unchanged. Request logs stay sanitized to hostname and pathname.

## Verification

- `pnpm exec biome check tests/e2e/specs/offline-fonts.spec.ts tests/e2e/fixtures/offline-fonts.ts` — passed.
- `git diff --check` — passed.
- `pnpm exec playwright test tests/e2e/specs/offline-fonts.spec.ts --list` — 4 tests collected.
- `pnpm --filter @reactive-resume/fonts test` — 55/55 passed.
- `pnpm --filter @reactive-resume/pdf exec vitest run src/hooks/use-register-fonts.test.ts` — 35/35 passed.
- `pnpm exec turbo boundaries` — passed on fresh rerun (Turbo 2.10.12, 1108 files, no issues).

Full diagnostic E2E remains unrun because this environment lacks production build output, PostgreSQL, and a production server. Server cold-network capture and verifiable restart identity remain external host-level blockers by design; this remediation does not claim that gate is complete.
