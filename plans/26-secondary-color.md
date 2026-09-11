# Plan 26: Define a secondary color token with explicit consumers and compatibility

## Selected direction and authority

Agent judgment: optional secondary color for decorative borders/separators only; resolve an unset value dynamically to primary, including after primary changes. Keep text, icons, ratings, fills, and explicit Semantic CSS overrides unchanged in this increment. Document that the issue’s gray heading/background examples remain achievable through existing CSS and are not automatically recolored by this token.

Implement the explicit decorative-consumer list after source inventory; do not perform a global primary-to-secondary replacement.

## Status

- **Issue:** [#3373](https://github.com/amruthpillai/reactive-resume/issues/3373).
- **Planned at:** `7a98f6662`, 2026-09-05. Priority P3, effort M, risk medium.
- **Readiness:** Direction selected above. Ready for later execution after the technical verification gates; this task remains documentation-only.
- **Confidence:** High for missing token/UI; which elements should consume it remains unresolved.

## Current state

Drift check: `rtk proxy git diff --stat 7a98f6662..HEAD -- packages/schema/src/resume/data.ts apps/web/src/routes/builder apps/web/src/features/resume/stylesheet packages/pdf/src/templates packages/resume/src/stylesheet`.

- `packages/schema/src/resume/data.ts:493`, `colorDesignSchema`, defines primary, text, background only.
- `apps/web/src/routes/builder/$resumeId/-sidebar/right/sections/design.tsx:102` has three ColorFormField instances. `useColorSectionForm` persists the entire color object through `useUpdateResumeData`.
- `packages/pdf/src/templates/onyx/OnyxPage.tsx` and `gengar/GengarPage.tsx` resolve accent colors from `colors.primary`; consumers differ by placement/template.
- `docs/applying-custom-styles.mdx:172` documents only `--resume-primary-color`, `--resume-text-color`, and `--resume-background-color`. Semantic CSS already supports explicit color values for targeted elements.
- `apps/web/src/features/resume/stylesheet/color-tokens.ts` and its tests own editor token behavior. A new picker alone will not create a renderer token.

## Scope and dependencies

Scope: schema/default/sample and compatibility tests; Design color form; stylesheet token/compiler ownership after locating its current implementation; template color role type and only decorative border/separator consumers. Apply equivalent decorative separator use in DOCX when present; do not recolor text or fills. No automatic recoloring of all text, contrast algorithm, gradient support, or palette generator. Coordinate plan 28's existing CSS documentation.

## Steps and gates

1. **Inventory consumers and demonstrate current alternative.** List every `colors.primary` use in all supported templates and classify it as text, border, fill, rating, or icon. Create a fixture with distinct primary/text/background and a CSS override targeting the issue's gray heading/background. Confirm what can already be achieved without new data.

   **Gate:** `rtk proxy pnpm --filter web exec vitest run src/features/resume/stylesheet/color-tokens.test.ts` and `rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/templates/shared/section-heading-color.test.tsx` pass. Record the exact consumer list to be changed, not a global search/replace instruction.

2. **Encode token semantics.** Store secondary as an optional color value; missing means dynamically follow primary at render time. Reset deletes the override. Add “Secondary Color” with “Use primary color” reset, and `--resume-secondary-color` to the documented semantic token surface. Inventory only border/separator consumers across templates and DOCX; preserve explicit CSS override precedence. Never persist a copied primary as the default.

   **Gate:** A truth table exists for missing/explicit/reset secondary and primary changes, with a named source-path list of decorative consumers before editing renderers.

3. **Add the selected token end to end.** Add schema parsing/round-trip tests first. Resolve fallback in a pure shared color role seam; do not persist computed fallback on every render. Add the Design picker/reset control and the semantic CSS token. Test invalid/empty values using the existing color validation policy. Ensure existing CSS overrides still win at their documented cascade layer.

   **Gate:** Tests fail before the new contract exists and pass afterward. `rtk proxy pnpm --filter @reactive-resume/schema test` plus token tests pass; resetting secondary restores live primary fallback after undo/save/reload.

4. **Change only selected visual consumers.** Use a synthetic fixture with primary red and secondary blue so raster assertions distinguish them. Verify decoration becomes blue, primary text/icons remain red, and old data produces pixel-equivalent output. Cover main/sidebar placements and custom style overrides.

   **Gate:** Focused PDF color tests and affected package typechecks pass. Run all-template presentation tests if shared color roles changed, and inspect any snapshot difference rather than automatically updating it.

## Done criteria and STOP conditions

- [ ] Fallback/reset semantics and specific consumers match the selected direction.
- [ ] Existing data and unset secondary retain current appearance and follow primary as agreed.
- [ ] UI, renderer, and optional CSS token have matching tests; no inert setting ships.
- [ ] Explicit stylesheet overrides and non-targeted template colors remain intact.

Stop if the token has no real decorative consumer or backward compatibility would require mutating every saved resume. Keep the issue’s separate fill/text examples documented as existing CSS recipes; do not claim the token automatically implements them.

## Executor rules and final gates

This remains documentation-only planning. The selected direction above may guide a later explicitly dispatched implementation; it does not authorize source changes during the present planning task. Agent judgments are not maintainer approvals. Follow recorded maintainer decisions when they differ. Use a fresh `codex/` worktree, leave other owners’ changes untouched, and never merge. The coordinator maintains the index. Do not post GitHub issue comments.

Before future code edits, run `rtk proxy git status --short` and `rtk proxy pnpm dlx @tanstack/intent@latest list`; load the most specific matching installed skill. Use package exports for cross-package imports. Resume schema changes start in `packages/schema`; pure resume behavior belongs in `packages/resume`; PDF code belongs in `packages/pdf`; editor controls belong in `apps/web`. Use `useUpdateResumeData` for builder mutations so undo and autosave participate. New visible strings use Lingui.

Run the focused commands, affected package typechecks, `rtk proxy pnpm exec turbo boundaries`, and `rtk proxy git diff --check`; each must exit 0. Use read-only Biome inspection on changed files, or explicitly acknowledge that `rtk proxy pnpm check` writes files and inspect its entire diff. Missing fixtures, failed commands, and unavailable checkers remain unresolved gates. Stop for contradicting source drift, unsafe data behavior, required scope expansion, or the same verification failure twice. Keep synthetic fixtures/generators in the repository and generated artifacts in test outputs, without secrets or temporary-path prerequisites.
