# Plan 34: Restore Gengar skill rating placement without changing other templates

## Selected direction and authority

Agent judgment: restore Gengar-local rating placement between the skill name and proficiency/keywords, while retaining the user’s stored rating design. Demonstrate legacy-style rectangles by selecting the existing rectangle design in the comparison fixture; do not force circles or other saved choices to become rectangles. Other templates remain unchanged.

Keep the order name → rating → proficiency → keywords in both stacked and inline Gengar modes, subject to existing wrapping rules. No new placement setting or schema field is needed.

## Status

- **Issue:** [#2611](https://github.com/amruthpillai/reactive-resume/issues/2611).
- **Planned at:** `7a98f6662`, 2026-09-05. Priority P3, effort M, risk medium because Skills uses shared rendering.
- **Readiness:** Direction selected above. Ready for later execution after the technical verification gates; this task remains documentation-only.
- **Confidence:** High for current shared order; historical rectangle dimensions and screenshot parity remain unverified. Related-issue mentions are not additional accepted requirements.

## Current state

Drift check: `rtk proxy git diff --stat 7a98f6662..HEAD -- packages/pdf/src/templates/gengar packages/pdf/src/templates/shared/sections.tsx packages/pdf/src/templates/shared/level-display.tsx packages/pdf/src/semantic packages/schema/src/resume/data.ts`.

- `packages/pdf/src/templates/shared/sections.tsx:1189`, `SkillsSection`, renders name/header, then proficiency and comma-joined keywords, then LevelDisplay outside the details View for stacked mode. In inline mode LevelDisplay is inside that details View after keywords.
- Gengar routes sections through this shared renderer. `gengar/semantic.ts` describes header/sidebar/featured/main regions and featured summary/sidebar-background parts; it has no dedicated skill-rating ordering contract.
- `packages/schema/src/resume/data.ts:483` already supports rectangle and rectangle-full among rating designs. Existing controls should be tested before calling rectangular ratings missing.
- `packages/pdf/src/templates/shared/skill-level-alignment.test.tsx` renders ratings with long keywords and multiple columns, checking raster bands and text. Preserve its alignment guarantees when reordering elements.

## Scope and dependencies

Scope includes the Gengar fixture and the selected template-local change. The fix belongs at a template-specific capability/style seam with matching semantic tree order; avoid a template-name conditional scattered across the shared renderer. No global Skills reorder, new rating scale, or schema migration; no new placement option is selected. Coordinate plan 22 keyword list mode, since both affect detail/rating order, and plan 24's level-size residuals.

## Steps and gates

1. **Render the current shape explicitly.** Create `packages/pdf/src/templates/gengar/gengar-skills.test.tsx` following the rating alignment harness. Include level 0/3/5, rectangle and rectangle-full, empty/nonempty proficiency, short/long keywords, one/two columns, sidebar/main placement, and inline/stacked section layout. Extract text and raster rating band y-coordinates; retain generated fixtures in source.

   **Gate:** `rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/templates/gengar/gengar-skills.test.tsx src/templates/shared/skill-level-alignment.test.tsx` passes characterization tests. The report distinguishes shape availability from ordering.

2. **Encode the visual order.** Set Gengar order to name → rating → proficiency → keywords in stacked and inline modes. Preserve stored design/type/size; include a rectangle fixture to demonstrate the legacy-style appearance already supported by the design model. Level 0 or hidden design contributes no rating spacing. No other template changes.

   **Gate:** Fixture assertions compare text/rating y-order in stacked mode and deterministic child/semantic order in inline mode; rectangle and circle cases both retain their shape.

3. **Implement a single template-owned ordering seam.** Expose the smallest explicit capability through existing TemplateProvider/style context if no suitable seam exists. The shared Skills renderer may consume it once. Keep semantic node order consistent with rendered order so CSS sibling/field selectors and accessible/export evaluation do not describe a different tree. Preserve LevelDisplay's zero/hidden behavior and avoid adding empty spacing for hidden ratings.

   **Gate:** New Gengar ordering assertions fail before implementation and pass after. A non-Gengar control (Onyx) is unchanged. `rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/templates/gengar/gengar-skills.test.tsx src/templates/shared/skill-level-alignment.test.tsx src/semantic/all-templates-presentation.test.ts` passes with only expected Gengar ordering snapshot differences.

4. **Verify size, wrapping, and persistence.** Long keywords/proficiency must not move or overlap neighboring item ratings; level-zero items have no stray band/gap. Test narrow sidebar, custom Skills section, both stylesheet modes where supported, and multi-page overflow. Do not add schema/UI work. Verify existing design selections persist and the template switch retains them.

   **Gate:** PDF raster/token assertions and PDF/web typechecks pass. Every skill and keyword token appears once and all non-Gengar baseline outputs remain unchanged.

## Done criteria and STOP conditions

- [ ] Shape versus placement is documented and ordering matches the selected direction.
- [ ] Gengar follows the selected ordering without overriding unrelated stored design choices.
- [ ] Shared alignment, semantic ordering, hidden ratings, and non-Gengar controls pass.
- [ ] No broad Skills redesign is included under a template-specific report.

Stop if the shared change moves other templates or semantic/rendered ordering diverges. Plan 22 supplies the selected keyword-list mode; integrate that fixture if it has landed. Do not claim legacy pixel parity without an approved reproducible reference.

## Executor rules and final gates

This remains documentation-only planning. The selected direction above may guide a later explicitly dispatched implementation; it does not authorize source changes during the present planning task. Agent judgments are not maintainer approvals. Follow recorded maintainer decisions when they differ. Use a fresh `codex/` worktree, leave other owners’ changes untouched, and never merge. The coordinator maintains the index. Do not post GitHub issue comments.

Before future code edits, run `rtk proxy git status --short` and `rtk proxy pnpm dlx @tanstack/intent@latest list`; load the most specific matching installed skill. Use package exports for cross-package imports. Resume schema changes start in `packages/schema`; pure resume behavior belongs in `packages/resume`; PDF code belongs in `packages/pdf`; editor controls belong in `apps/web`. Use `useUpdateResumeData` for builder mutations so undo and autosave participate. New visible strings use Lingui.

Run the focused commands, affected package typechecks, `rtk proxy pnpm exec turbo boundaries`, and `rtk proxy git diff --check`; each must exit 0. Use read-only Biome inspection on changed files, or explicitly acknowledge that `rtk proxy pnpm check` writes files and inspect its entire diff. Missing fixtures, failed commands, and unavailable checkers remain unresolved gates. Stop for contradicting source drift, unsafe data behavior, required scope expansion, or the same verification failure twice. Keep synthetic fixtures/generators in the repository and generated artifacts in test outputs, without secrets or temporary-path prerequisites.
