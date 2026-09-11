# Plan 30: Evaluate current PDF and DOCX exports before defining an ATS preset

## Selected direction and authority

Agent judgment: evaluate and improve a generic plain export with no vendor label or parsing-percentage guarantee. Preserve original resume data and free-text dates. A plain export uses a cloned projection, visible sections in existing authored traversal order, one column, standard Latin PDF font for supported Latin fixtures, and no decorative pictures/icons; multilingual font support must preserve glyphs and state its tested limits.

Measure existing PDF/DOCX first. Add a preset only for measured deficiencies and preserve all visible text/custom sections. Vendor integrations remain a separate unapproved feature.

## Status

- **Issue:** [#2845](https://github.com/amruthpillai/reactive-resume/issues/2845).
- **Planned at:** `7a98f6662`, 2026-09-05. Priority P2, effort L for evaluation, risk medium/high for misleading compatibility claims.
- **Readiness:** Direction selected above. Ready for later execution after the technical verification gates; this task remains documentation-only.
- **Evidence:** The issue requests single-column standard-font PDF/DOCX, consistent dates, preview, and vendor-specific guarantees. Current DOCX and ATS checks already exist; do not implement a duplicate export path or equate the application's heuristic score with a vendor parser score.

## Current state

Drift check: `rtk proxy git diff --stat 7a98f6662..HEAD -- packages/docx packages/resume/src/ats packages/resume/src/ats-pdf apps/web/src/features/resume/export packages/pdf/src/document.tsx`.

- `apps/web/src/features/resume/export/download-dialog.tsx` already offers PDF, DOCX, Markdown, and JSON. DOCX description says it is editable in Word, Google Docs, and Pages.
- `packages/docx/src/index.ts` exports `buildDocx`, which validates input then calls `buildDocument` and `Packer.toBlob`.
- `packages/docx/src/builder.ts` consumes saved main/sidebar sections; current DOCX is not necessarily a forced single-column plain preset. Name uses Word Title style; section renderers own paragraph content.
- `packages/resume/src/ats` checks structured resume content. `packages/resume/src/ats-pdf` analyzes extracted PDF geometry/text. Neither is an official Workday/SuccessFactors test harness.
- `packages/resume/src/ats/period.ts:199` parses human period strings, including localized months and ongoing tokens. Do not rewrite dates in stored user content just to obtain a higher local score.

## Scope and dependencies

Scope: repository fixture corpus, reproducible extraction metrics, evaluation report, and a measured generic preset where necessary. Preset code belongs in pure resume/export options and existing export adapters, not a second server exporter. Coordinate plan 31 for document accessibility, plan 27 for offline font assumptions, and plan 32 for period parsing; no dependency means those product choices are automatically approved. No real recruiting-account uploads or third-party parser requests without explicit authorization.

## Steps and gates

1. **Define measurable claims.** Create synthetic data with exact expected name/contact/companies/roles/dates/education/skills tokens, two columns, custom sections, hidden items, links, and non-Latin content. Define recall as expected distinct field tokens recovered divided by expected tokens; separately measure order, duplicate count, and semantic grouping. State corpus size and token matching rules. Do not call this vendor parsing accuracy.

   **Gate:** Add a fixture generator and evaluator under `tooling/` or existing test directories after checking their ownership conventions. A unit test deliberately drops/duplicates a token and proves the metric catches it. The report records raw counts, not only a percentage.

2. **Measure current exports unchanged.** Generate PDFs through `ResumeDocument` and DOCX through `buildDocx`. Extract PDF text with installed PDF.js and DOCX paragraph text/numbering from its ZIP XML. Keep artifacts under test output paths. Compare saved two-column layout, an existing full-width template, and current DOCX. Include long lines, symbols, dates, multiple roles, and custom sections.

   **Gate:** `rtk proxy pnpm --filter @reactive-resume/docx test`, `rtk proxy pnpm --filter @reactive-resume/resume test`, and the new evaluation tests pass. Results identify concrete lost/misordered fields before prescribing a preset. A rendering failure remains separate from extraction quality.

3. **Define the generic plain projection.** Offer the selected plain option through the existing PDF/DOCX export dialog only if baseline metrics show useful improvement. Build from a clone: keep visible sections/custom sections in existing authored traversal order, use one column, retain literal field/date text and links, omit decorative photo/icons, and use standard Helvetica for Latin PDF fixtures. Multilingual text retains tested fallback support rather than losing glyphs to enforce a font label. DOCX uses normal paragraphs and real heading/list constructs. Preview the same projection downloaded by the action; never mutate saved data.

   **Gate:** Tests prove projection immutability, identical visible token multiset, stable order, retained links/free-text dates, and no private/vendor calls. UI wording says plain export, without Workday/SuccessFactors labels or a parsing guarantee. A later vendor request needs its own primary-source contract.

4. **Implement only measured necessary changes.** Add a pure projection or explicit export option at the existing export seam. Preserve all visible content and layout-defined ordering without a separate requirement; do not silently drop custom sections or rewrite dates. Tests should assert the input data is unchanged after export and every expected token remains. Reuse current download progress/error handling and preview rather than adding a duplicate workflow.

   **Gate:** New regression fixtures show improved measured cases, zero unintended content loss, and equivalent results for already-good inputs. `rtk proxy pnpm --filter web typecheck`, PDF/DOCX typechecks, boundaries, and relevant E2E export tests pass.

## Done criteria and STOP conditions

- [ ] Current exports are measured with a documented synthetic corpus and raw token/order results.
- [ ] Generic wording/projection match the selected direction; vendor/95% claims are absent.
- [ ] Any preset preserves input data, visible content, and the selected authored traversal order.
- [ ] PDF/DOCX results and local ATS heuristics are reported as different measurements.

Stop if a claim needs unavailable vendor access, the chosen metric can be gamed by dropping content, or an export transform mutates saved data. A high local ATS score cannot close a vendor-compatibility request by itself.

## Executor rules and final gates

This remains documentation-only planning. The selected direction above may guide a later explicitly dispatched implementation; it does not authorize source changes during the present planning task. Agent judgments are not maintainer approvals. Follow recorded maintainer decisions when they differ. Use a fresh `codex/` worktree, leave other owners’ changes untouched, and never merge. The coordinator maintains the index. Do not post GitHub issue comments.

Before future code edits, run `rtk proxy git status --short` and `rtk proxy pnpm dlx @tanstack/intent@latest list`; load the most specific matching installed skill. Use package exports for cross-package imports. Resume schema changes start in `packages/schema`; pure resume behavior belongs in `packages/resume`; PDF code belongs in `packages/pdf`; editor controls belong in `apps/web`. Use `useUpdateResumeData` for builder mutations so undo and autosave participate. New visible strings use Lingui.

Run the focused commands, affected package typechecks, `rtk proxy pnpm exec turbo boundaries`, and `rtk proxy git diff --check`; each must exit 0. Use read-only Biome inspection on changed files, or explicitly acknowledge that `rtk proxy pnpm check` writes files and inspect its entire diff. Missing fixtures, failed commands, and unavailable checkers remain unresolved gates. Stop for contradicting source drift, unsafe data behavior, required scope expansion, or the same verification failure twice. Keep synthetic fixtures/generators in the repository and generated artifacts in test outputs, without secrets or temporary-path prerequisites.
