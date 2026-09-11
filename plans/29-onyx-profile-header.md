# Plan 29: Add optional Onyx header profile placement without duplicate content

## Selected direction and authority

Agent judgment: optional Onyx header placement for Profiles, with current body layout as default. Opt-in routes visible, placed Profiles to the first authored page header and suppresses its body occurrence; hidden or entirely unplaced Profiles stay absent. Do not repeat profiles on overflow pages.

Add one backward-compatible template option and retain profile IDs/order/links. Many profiles wrap naturally; content may flow but cannot be clipped or silently truncated.

## Status

- **Issue:** [#2812](https://github.com/amruthpillai/reactive-resume/issues/2812).
- **Planned at:** `7a98f6662`, 2026-09-05. Priority P3, effort M, risk medium.
- **Readiness:** Direction selected above. Ready for later execution after the technical verification gates; this task remains documentation-only.
- **Evidence:** Two screenshots compare the old and new output; no source resume or dimensions are provided. High confidence in current source routing, unverified pixel parity with the older renderer.

## Current state

Drift check: `rtk proxy git diff --stat 7a98f6662..HEAD -- packages/pdf/src/templates/onyx packages/pdf/src/templates/shared/sections.tsx packages/pdf/src/semantic packages/schema/src/resume apps/web/src/routes/builder`.

- `packages/pdf/src/templates/onyx/OnyxPage.tsx:60` obtains main/sidebar section IDs and renders each with shared `Section`. Profiles therefore follows saved layout placement.
- Its `Header` reads `basics` and `picture`, rendering identity and the Basics contact list; it does not read profile section items.
- `packages/pdf/src/templates/onyx/semantic.ts` defines header/main/sidebar regions and item-header-row parts, with no separate profile-header route.
- Shared Profiles rendering already owns icon/link/visibility semantics. Reimplementing links inside the header would create duplicate behavior unless the same existing section/item representation is reused deliberately.

## Scope and dependencies

Scope covers the synthetic comparison, Onyx page/manifest, a backward-compatible template setting at the existing schema/UI owner, and focused PDF/UI tests. Shared profile formatting changes are out of scope unless required to reuse a single primitive. Other templates and stored profile item order must stay intact. Coordinate plan 20's placement semantics and plan 31's accessible reading order.

## Steps and gates

1. **Create an Onyx comparison fixture.** Use two profiles with distinct network/username/URL, long URL labels, one hidden profile, visible contact fields, and picture on/off. Render with profiles in main, sidebar, unplaced, and on a second authored page. Extract text count/link annotations and raster coordinates. This identifies whether moving profiles to the header would duplicate or reveal intentionally unplaced content.

   **Gate:** Add `packages/pdf/src/templates/onyx/onyx-profiles.test.tsx` using the existing semantic PDF fixture harness. `rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/templates/onyx/onyx-profiles.test.tsx src/semantic/template-manifest.test.ts` passes current-behavior assertions.

2. **Specify the optional route once.** Add an Onyx-specific profile-placement option with body as default and header as opt-in. The setting persists when switching templates but only affects Onyx. Resolve visible, placed Profiles into the first authored page header when enabled; remove its body rendering, preserve item order, and keep hidden/unplaced content absent. Multiple saved layout references must not create duplicate header entries. Let long labels wrap; never truncate links or clip profile content.

   **Gate:** Tests encode body/default, header/placed, header/hidden, header/unplaced, duplicate layout reference, later authored page, and template-switch cases with exact visible token counts.

3. **Implement the selected routing once.** Add the backward-compatible setting through the schema/UI owner. Route profiles into an Onyx header region and suppress only the corresponding original rendering under the specified rule. Reuse existing filtering, links, icons, and semantic item keys. Update the Onyx manifest and tree/binding tests so stylesheet selectors match the actual render. Never mutate layout arrays during PDF generation.

   **Gate:** New tests fail before the feature and pass afterward: each visible profile occurs exactly once, hidden entries stay absent, URL annotations are correct, defaults retain current output, and only the first authored page owns header profiles.

4. **Verify geometry and editing.** Long contact/profile labels must not overlap the name/picture or clip at narrow page widths. Test RTL, missing picture, many profiles, and multiple pages. Test the option’s undo/save/reload/locked state and preserve natural wrapping without an arbitrary item limit.

   **Gate:** Focused PDF tests, `rtk proxy pnpm --filter @reactive-resume/schema test`, affected web/PDF typechecks, and boundaries pass. Inspect raster artifacts for the selected top-right placement.

## Done criteria and STOP conditions

- [ ] Default and opt-in behavior match the selected routing matrix and visual fixture.
- [ ] No profile duplication, hidden-item leakage, or render-time mutation occurs.
- [ ] Semantic tree and output agree; links and long labels survive.
- [ ] Other templates and default old JSON retain their behavior.

Stop if header routing overrides hidden/unplaced intent, repeat-on-overflow behavior cannot be prevented without broad renderer changes, or fitting profiles requires deleting content. Old screenshots alone do not define a safe migration policy.

## Executor rules and final gates

This remains documentation-only planning. The selected direction above may guide a later explicitly dispatched implementation; it does not authorize source changes during the present planning task. Agent judgments are not maintainer approvals. Follow recorded maintainer decisions when they differ. Use a fresh `codex/` worktree, leave other owners’ changes untouched, and never merge. The coordinator maintains the index. Do not post GitHub issue comments.

Before future code edits, run `rtk proxy git status --short` and `rtk proxy pnpm dlx @tanstack/intent@latest list`; load the most specific matching installed skill. Use package exports for cross-package imports. Resume schema changes start in `packages/schema`; pure resume behavior belongs in `packages/resume`; PDF code belongs in `packages/pdf`; editor controls belong in `apps/web`. Use `useUpdateResumeData` for builder mutations so undo and autosave participate. New visible strings use Lingui.

Run the focused commands, affected package typechecks, `rtk proxy pnpm exec turbo boundaries`, and `rtk proxy git diff --check`; each must exit 0. Use read-only Biome inspection on changed files, or explicitly acknowledge that `rtk proxy pnpm check` writes files and inspect its entire diff. Missing fixtures, failed commands, and unavailable checkers remain unresolved gates. Stop for contradicting source drift, unsafe data behavior, required scope expansion, or the same verification failure twice. Keep synthetic fixtures/generators in the repository and generated artifacts in test outputs, without secrets or temporary-path prerequisites.
