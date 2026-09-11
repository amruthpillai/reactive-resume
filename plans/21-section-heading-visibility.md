# Plan 21: Separate heading visibility from the localized title fallback

## Status and decision gate

- **Issues:** [#3060](https://github.com/amruthpillai/reactive-resume/issues/3060).
- **Planned at:** `7a98f6662`, 2026-09-05.
- **Priority / effort / risk:** P2 / M / medium; blank-title migration can change every existing resume.
- **Readiness:** Product direction approved (Q1, 2026-09-05): add an explicit Show heading toggle that hides heading, icon, and separator while retaining content and the builder name. Preserve empty-title localized fallback. Q2 approved (2026-09-05): Move to creates continuations with visible headings until explicitly hidden. Q3 approved: hide visual headings consistently in preview, PDF, and DOCX while retaining section labels in the screen-reader outline.
- **Confidence:** High for current fallback behavior; no historical cloud fixture reproduced. #3060 reports Kakuna continuation sections made through Move to repeating their heading and separator.

## Current state and evidence

Drift check: `rtk proxy git diff --stat 7a98f6662..HEAD -- packages/schema/src/resume packages/pdf/src/section-title.ts packages/pdf/src/templates/shared/sections.tsx apps/web/src/routes/builder packages/docx/src`.

- `packages/pdf/src/section-title.ts`, `resolveSectionTitle`: `if (title.trim()) return title;` then resolves the localized default. Empty title deliberately means default, including custom sections of built-in types.
- `apps/web/src/routes/builder/$resumeId/-sidebar/left/shared/section-menu.tsx:64` says “Leave empty to reset the title to the original.” Do not change that established contract silently.
- `left/shared/section-item.tsx:91`, `handleNewSectionOnPage`, calls `moveItem(... target: { type: "new-section", title: currentSectionTitle, pageIndex })`; a continuation is a real custom section with a copied title, not an automatic overflow page.
- `packages/schema/src/resume/data.ts:284`, `baseSectionSchema`, has title, icon, columns, hidden, keepTogether, startOnNewPage. There is no persisted heading-only visibility flag. Summary has parallel fields.
- `packages/pdf/src/templates/shared/sections.tsx`, `SectionShell`, renders heading plus decoration separately from children. Its icon branch gates the heading container on `showHeading && sectionHeadingVisible`; the no-icon branch uses `showHeading` and the semantic Heading primitive. Verify both branches, not only text disappearance.
- Semantic CSS already addresses `section-heading`; test whether `display: none` removes the complete decoration in Kakuna before proposing a new feature.

## Scope and dependencies

If approved, schema/default/sample tests, existing section menu and custom section menu, `SectionShell`, section-title tests, and DOCX section heading behavior are candidate owners. A new UI flag must cover summary, built-ins, and custom sections, not only Experience. Dependency: coordinate with plan 20 without conflating section hidden state and heading hidden state. Do not change Move to identity/content semantics or automatically rename continuations. Q2 requires newly created continuations to show their heading until the user explicitly hides it; do not infer hidden headings from copied titles or page position.

## Ordered work and verification

### 1. Build the exact continuation control

Clone `sampleResumeData`, select Kakuna, move one Experience item into a custom Experience section on an authored second page through the existing UI. Save/reload and export JSON. Assert the original item ID/text moved once, each section remains visible, and the new title is copied. Verify the new continuation heading is visible, including when the source heading was explicitly hidden: the approved creation default is visible. Set its title to empty and verify the current localized fallback. Add this characterization to a focused section-heading test using `packages/pdf/src/semantic/issue-fixtures.test.tsx` as renderer harness.

**Gate:** `rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/section-title.test.ts src/semantic/issue-fixtures.test.tsx` passes; captured JSON and PDF distinguish the continuation from overflow.

### 2. Test the existing CSS alternative before choosing a schema

Apply `@version 1; section[id="continuation-id"] section-heading { display: none; }` to a synthetic custom section with that ID. Compile through `compileStylesheet` and render Kakuna with section icons on and off. Extract PDF text and rasterize with `packages/pdf/src/semantic/test/rasterize-pdf.ts`; verify the heading token and underline pixels are absent while item tokens remain. Preserve the first section heading. If this succeeds, record the exact supported selector as an alternative for the owner. If it fails, capture which semantic binding or decoration remains; that is a separate focused defect, not evidence that empty titles should change meaning.

**Gate:** A new `src/semantic/section-heading-visibility.test.tsx` test passes for the characterized CSS contract, or provides a deterministic failure and diagnostic. Do not invent expected UI behavior yet.

### 3. Implement the approved toggle during later execution

For an approved explicit setting, add a backward-compatible boolean defaulting to true to summary/base section schemas and all current default/sample fixtures. Extend JSON round-trip tests to prove absent values preserve today's headings. Add a heading-only toggle in existing menus; hidden section state and title text remain unchanged. In `SectionShell`, omit the complete heading/icon/decoration group when disabled. Apply the same visual omission in DOCX. Keep section labels in the existing screen-reader outline regardless of heading visibility; do not remove semantic section navigation when hiding visual headings. Coordinate with plan 31 without assuming PDF tagging conformance. The explicit UI control is approved; CSS is a complementary diagnostic and existing alternative, not a replacement for the approved feature.

**Gate:** `rtk proxy pnpm --filter @reactive-resume/schema test` and focused PDF tests pass. Web menu tests verify toggle, undo, save/reload, custom/built-in/summary, and locked resume behavior. Test that DOCX omits the visible heading and that the screen-reader outline still exposes the section label.

### 4. Compare output and compatibility

Add old JSON without the new flag, explicit true/false, empty/nonempty title, icon enabled/disabled, and one-page/two-page fixtures. Assert body text survives exactly once and title fallback is unchanged when visible. Add PDF raster assertions for separators, not text-only assertions.

**Gate:** Schema/PDF/DOCX tests and web typecheck pass; current JSON export/import round trip remains green.

## Done criteria

- [ ] The chosen product contract is recorded; empty existing titles retain their approved interpretation.
- [ ] Heading, icon, and separator behave together without hiding content.
- [ ] Summary, built-in, and custom continuation cases survive undo and JSON round trip.
- [ ] Kakuna output demonstrates the reported continuation case; no claim is made about unrelated pagination.

## Issue-specific STOP conditions

Stop if the proposal would migrate all blank titles, remove the approved accessible section labels, or require generating physical overflow pages as saved layout objects. Do not close #3060 merely because the title string is empty; prove decoration and output behavior.

## Executor rules and final gates

This is a plan for later execution, not implementation authorization. The user stopped further source work after PRs #3453/#3454. Obtain the recorded product decision and later execution instruction before dependent changes. Use a fresh `codex/` worktree, leave other owners' edits untouched, and never merge. The coordinator maintains the plan index. Do not post GitHub issue comments.

Before code edits, run `rtk proxy git status --short` and `rtk proxy pnpm dlx @tanstack/intent@latest list`; load the most specific matching installed skill. Use package exports for cross-package imports. Resume schema changes start in `packages/schema`; pure resume behavior belongs in `packages/resume`; PDF code belongs in `packages/pdf`; editor controls belong in `apps/web`. Use `useUpdateResumeData` for builder changes so undo and autosave participate. Do not alter the generated route tree. New visible strings use Lingui.

After approved implementation, run the focused commands in this plan, affected package typechecks, `rtk proxy pnpm exec turbo boundaries`, and `rtk proxy git diff --check`. Each must exit 0. Run read-only Biome inspection on changed files, or explicitly note that `rtk proxy pnpm check` writes files and review its entire diff. A missing fixture, failed command, or unavailable checker is an unresolved gate, not success. Stop if source drift changes the stated contract, a fix requires files outside scope, or the same gate fails twice after a bounded attempt. Keep synthetic fixtures and generation code in the repository; generated outputs belong in test artifacts, with no secret or `/tmp` prerequisite.
