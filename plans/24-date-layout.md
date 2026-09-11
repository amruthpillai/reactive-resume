# Plan 24: Define date placement without conflating existing style controls

## Status and decision gate

- **Issues:** [#3155](https://github.com/amruthpillai/reactive-resume/issues/3155), [#2841](https://github.com/amruthpillai/reactive-resume/issues/2841).
- **Planned at:** `7a98f6662`, 2026-09-05. Priority P3, effort M, risk medium. Q4 approved (2026-09-05): an optional dedicated left date column with entry details aligned beside it, preserving current layout by default. Q5 approved: date column follows reading start, left for LTR and right for RTL. Q6 approved: user-controlled width per section, long dates wrap within the column, and entry details stay aligned. Q7 expands support to every section type with a free-text date field, including custom equivalents. Q8 approved: support all templates, preserving each template’s current layout when disabled. Q9 approved: entries without dates leave the date column empty and retain the same detail alignment as dated entries.
- **Evidence confidence:** High for current shared rendering and existing controls; the exact historical Chikorita visual parity remains unverified. #3155 asks for left-aligned dates; a comment distinguishes an outdented fixed-width date column from simple field order. #2841 bundles date/location order, large level icons, and link underlines after a v4-to-v5 migration. A contributor's CSS suggestion is not owner approval for a new global setting.

## Current state

Drift check: `rtk proxy git diff --stat 7a98f6662..HEAD -- packages/schema/src/resume packages/pdf/src/templates/chikorita packages/pdf/src/templates/shared packages/pdf/src/semantic apps/web/src/routes/builder`.

- `packages/pdf/src/templates/shared/sections.tsx:873` computes `headerLocation = hasLocation ? item.location : item.period` and `headerPeriod = hasLocation ? item.period : ""`; location absence deliberately changes which slot carries the period. Inspect the complete Experience and Education branches before swapping fields.
- `packages/pdf/src/templates/chikorita/ChikoritaPage.tsx` owns the template's column styles and routes sections through shared `Section`; do not rewrite all templates to satisfy a screenshot of one.
- `packages/pdf/src/semantic/item-header-row.test.tsx` distinguishes a certification title/date row from stacked Experience. Semantic fields/combined fields have different parents; a universal CSS `order` rule cannot be presumed equivalent to a left column.
- `packages/schema/src/resume/data.ts:475` already contains `hideLinkUnderline`. `:483` supports hidden/circle/square/rectangle/progress/icon level designs. `packages/schema/src/resume/level-display-sizes.ts` and Design UI support level size resolution. These are current partial controls for #2841, not missing features to recreate.
- `docs/applying-custom-styles.mdx` documents named fields and item-header styling; verify a concrete stylesheet before adding a persisted setting.

## Scope and dependencies

**Approved Q7 coverage:** Awards (`date`), Certifications (`date`), Education (`period`), Experience (`period` and nested role `period`), Projects (`period`), Publications (`date`), and Volunteer (`period`), including custom sections of every listed type. These are string fields in `packages/schema/src/resume/data.ts`; enumerate the execution revision again to catch additions. The goal is consistent date presentation throughout the resume, not only Experience/Education. Preserve all stored free-text values. Add each supported type to the rendering, persistence, and empty/long-date matrix; nested roles must retain their association with the parent experience and their own dates.


Diagnostic fixtures belong in `packages/pdf/src/templates/shared/date-layout.test.tsx`. Implementation must cover all templates through their existing shared or template-specific layout owners, semantic manifest/tree bindings, and a narrowly scoped schema/UI control only if required by the decision. Coordinate plan 23 pagination and plan 33 Europass date-column design; do not use those plans as approval. Link underline and level size behavior should be verified and documented, not changed without a reproduced residual.

## Steps and gates

1. **Build separate issue matrices.** Create Chikorita and a template selected for #3155 with every Q7-supported section type, custom equivalents, multiple Experience roles, blank location, blank period, a long localized date range, and RTL content. Extract PDF text positions as well as raster images. For #2841 toggle hideLinkUnderline and level design/size independently to identify remaining gaps. Keep data unchanged across renders.

   **Gate:** `rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/templates/shared/date-layout.test.tsx src/semantic/item-header-row.test.tsx` passes characterization assertions and records date/location coordinates. `rtk proxy pnpm --filter @reactive-resume/schema exec vitest run src/resume/level-display-sizes.test.ts` passes.

2. **Settle the remaining date-column contract.** Q4 selects a dedicated date column, not date-first inline ordering. Section scope is settled by Q7 and all-template coverage by Q8. Apply the approved per-section width control, wrapping long dates without truncation, aligned entry details, and logical-start placement (left LTR, right RTL). Validate width units, bounds, and initial geometry with narrow and wide column fixtures; do not invent a fixed numeric specification from Q6. Preserve existing layouts when the option is not selected. Use a concrete fixture to illustrate unresolved geometry before implementation; do not reopen the approved column choice as an unanswered question.

   **Gate:** The plan contains an approved visual target with explicit empty/long/RTL behavior. Without it, stop after characterization.

3. **Implement the selected placement at its owner.** Add backward-compatible schema settings preserving existing output and tests for old JSON. Implement the shared behavior where appropriate and explicitly cover template-specific layout seams so every template supports the option. Preserve the settings when switching templates. Ensure date and location remain separate semantic fields; do not reorder by swapping stored strings. Preserve role progression, links, and actual reading order. A dedicated column needs a real bounded column layout; CSS text alignment alone is insufficient. Persist the approved width per section, preserve it through undo/save/import, and keep all entry details aligned to the same content-column start. Long dates wrap within the date column without truncation. Undated entries keep an empty date cell and the same content-column start; do not collapse the column or substitute location into it.

   **Gate:** New coordinate assertions fail before implementation and pass afterward. For the approved dedicated column, period x-position remains equal across short/long titles and descriptions align to the content column; a date-first inline row alone cannot meet Q4. All text appears once, and no column overlaps at narrow widths. Mixed dated/undated and entirely undated fixtures retain the selected column geometry; empty dates never pull entry details into the date column.

4. **Verify residuals individually.** Run tests for section header alignment, item-header binding, and current style-rule resolution. For every template, generate an old-default PDF and compare it against the baseline when the new setting is not selected. Exercise the enabled option across all supported section types; test template switching retains settings. Add UI undo/persistence tests if a control was approved; no UI tests are needed for a documentation-only result.

   **Gate:** `rtk proxy pnpm --filter @reactive-resume/pdf test`, affected schema/web typechecks, and boundaries pass. Record a separate result for each #2841 subrequest instead of declaring the bundle fixed.

## Done criteria and STOP conditions

- [ ] The date layout policy and template scope are explicitly approved.
- [ ] Period/location data stays unchanged; long/empty/RTL and role-progression cases pass. RTL fixtures prove the column mirrors to the right while LTR fixtures retain the left column.
- [ ] Existing hide-underlines and level-size controls are verified before any duplicate feature is proposed.
- [ ] Each issue/subrequest has its own output evidence; no broad parity claim rests on one screenshot.

Stop if date-first and fixed-column expectations remain ambiguous, a shared change alters any template while the option is disabled, or a purported layout fix requires changing stored date strings. Treat old v4 pixel parity as unconfirmed without a reproducible reference.

## Executor rules and final gates

This is a plan for later execution, not implementation authorization. The user stopped further source work after PRs #3453/#3454. Obtain the recorded product decision and later execution instruction before dependent changes. Use a fresh `codex/` worktree, leave other owners' edits untouched, and never merge. The coordinator maintains the plan index. Do not post GitHub issue comments.

Before code edits, run `rtk proxy git status --short` and `rtk proxy pnpm dlx @tanstack/intent@latest list`; load the most specific matching installed skill. Use package exports for cross-package imports. Resume schema changes start in `packages/schema`; pure resume behavior belongs in `packages/resume`; PDF code belongs in `packages/pdf`; editor controls belong in `apps/web`. Use `useUpdateResumeData` for builder changes so undo and autosave participate. Do not alter the generated route tree. New visible strings use Lingui.

After approved implementation, run the focused commands in this plan, affected package typechecks, `rtk proxy pnpm exec turbo boundaries`, and `rtk proxy git diff --check`. Each must exit 0. Run read-only Biome inspection on changed files, or explicitly note that `rtk proxy pnpm check` writes files and review its entire diff. A missing fixture, failed command, or unavailable checker is an unresolved gate, not success. Stop if source drift changes the stated contract, a fix requires files outside scope, or the same gate fails twice after a bounded attempt. Keep synthetic fixtures and generation code in the repository; generated outputs belong in test artifacts, with no secret or `/tmp` prerequisite.
