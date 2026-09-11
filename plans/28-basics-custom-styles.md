# Plan 28: Verify existing Basics styling and isolate unsupported residuals

## Selected direction and authority

Agent judgment: document and verify existing Basics Semantic CSS; defer gradients until a concrete residual fixture and separate renderer feasibility design exist. This follows the owner’s existing partial-resolution comment and does not claim every historical layout restored.

Proceed with tested documentation examples and only reproducible advertised-binding fixes; no new gradient capability.

## Status

- **Issue:** [#3137](https://github.com/amruthpillai/reactive-resume/issues/3137).
- **Planned at:** `7a98f6662`, 2026-09-05. Priority P3, effort S for verification/documentation, unresolved for new rendering capabilities; risk low for documentation and high for arbitrary CSS expansion.
- **Readiness:** Direction selected above. Ready for later execution after the technical verification gates; this task remains documentation-only.
- **Evidence:** The report bundles header branding, gradients, spacing/line breaks, and icons. On 2026-09-05 the owner explicitly stated that current Semantic CSS supports header/name/headline/contact-list/contact-item/icon/field/page/region styling, linked the guide, and requested an exact remaining template/CSS case. Confidence is high that much of the original missing selector surface now exists; historical appearance is not automatically restored.

## Current state

Drift check: `rtk proxy git diff --stat 7a98f6662..HEAD -- docs/applying-custom-styles.mdx packages/pdf/src/semantic packages/pdf/src/templates/shared packages/resume/src/stylesheet apps/web/src/features/resume/stylesheet`.

- `docs/applying-custom-styles.mdx:74` documents `header`; subsequent tables expose name/headline/contact-list/contact-item, item-header, fields, icons, page/region, and template-specific parts.
- `:188` lists supported visual properties including background-color, border, border-radius, opacity, and transform. `:352` explicitly excludes gradients, general browser APIs, and external assets.
- `packages/pdf/src/semantic/issue-fixtures.test.tsx:154` already has the test “styles Basics/header nodes while rejecting unsupported gradients (#3137)”. Its rejected source is `header { background-image: linear-gradient(red, blue); }`.
- Templates use semantic wrappers such as `SemanticHeaderView` and `SemanticContactListView`. This is a PDF semantic stylesheet, not a browser DOM stylesheet; adding a selector cannot make an unsupported renderer property work.

## Scope and dependencies

Ready scope: extend issue fixtures or documentation with confirmed current examples; record unsupported residuals. Any bug fixes must be limited to a reproduced semantic binding/property advertised by the guide. No gradient implementation, unrestricted CSS, legacy renderer restoration, new basics schema, or blanket parsing relaxation. Coordinate plan 26 if its selected secondary token has landed; do not invent an implementation of its token here.

## Steps and gates

1. **Verify the already supported surface.** Extend the existing synthetic fixture with name/headline, email/phone/location, custom contact field, and company/position. Compile explicit selectors for header spacing, name color, headline font size, contact-list gap, contact-item padding, company bold, and icon size. Select the actual template named by a future minimal report; until supplied, test the existing Onyx fixture and label the limit.

   **Gate:** `rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/semantic/issue-fixtures.test.tsx src/semantic/binding-inventory.test.ts` exits 0. Each asserted style reaches the intended rendered primitive, not merely the compiler AST.

2. **Separate unsupported requests from binding defects.** Retain a gradient rejection test and verify the editor displays a useful unsupported-property diagnostic without destroying the prior valid stylesheet. For line wrapping, use a long synthetic name/contact value and measure actual PDF text placement; do not claim CSS can inject new resume content or arbitrary HTML line breaks.

   **Gate:** Existing stylesheet worker/editor tests pass, and a deterministic source string distinguishes compiler rejection, missing semantic node, supported-property rendering failure, and a template layout constraint. Stop if no exact residual can be reproduced.

3. **Document supported behavior.** Add small tested examples to `docs/applying-custom-styles.mdx`, including the supported target and explicit gradient limitation. Use public synthetic text and real documented selectors. If a supported binding fails, add a failing PDF host-tree/raster regression before a narrow binding fix. A later gradient request requires a concrete visual fixture and renderer feasibility design; keep it outside this increment.

   **Gate:** Every documentation snippet compiles and its matching fixture assertion passes. No code outside the reproduced binding changes. The issue remains open for unspecified residuals.

4. **Validate current behavior across templates.** Run semantic all-template presentation tests if a shared binding changes, then inspect unexpected differences. A documentation-only update needs no broad source test suite beyond snippet verification and Markdown/diff checks.

   **Gate:** `rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/semantic/all-templates-presentation.test.ts src/semantic/issue-fixtures.test.tsx` passes for a shared fix; `rtk proxy git diff --check` passes in either case.

## Done criteria and STOP conditions

- [ ] Existing Basics selectors are verified, not reimplemented.
- [ ] Each claimed example has a compiling source and rendered assertion.
- [ ] Gradient support remains deferred with the need for a concrete fixture recorded.
- [ ] Owner's partial-resolution statement and any remaining limitations are preserved accurately.

Stop if there is no minimal residual, if a requested effect needs unsupported PDF-engine behavior, or if the proposed fix weakens stylesheet validation. Do not close the bundled issue from a single successful header-color test.

## Executor rules and final gates

This remains documentation-only planning. The selected direction above may guide a later explicitly dispatched implementation; it does not authorize source changes during the present planning task. Agent judgments are not maintainer approvals. Follow recorded maintainer decisions when they differ. Use a fresh `codex/` worktree, leave other owners’ changes untouched, and never merge. The coordinator maintains the index. Do not post GitHub issue comments.

Before future code edits, run `rtk proxy git status --short` and `rtk proxy pnpm dlx @tanstack/intent@latest list`; load the most specific matching installed skill. Use package exports for cross-package imports. Resume schema changes start in `packages/schema`; pure resume behavior belongs in `packages/resume`; PDF code belongs in `packages/pdf`; editor controls belong in `apps/web`. Use `useUpdateResumeData` for builder mutations so undo and autosave participate. New visible strings use Lingui.

Run the focused commands, affected package typechecks, `rtk proxy pnpm exec turbo boundaries`, and `rtk proxy git diff --check`; each must exit 0. Use read-only Biome inspection on changed files, or explicitly acknowledge that `rtk proxy pnpm check` writes files and inspect its entire diff. Missing fixtures, failed commands, and unavailable checkers remain unresolved gates. Stop for contradicting source drift, unsafe data behavior, required scope expansion, or the same verification failure twice. Keep synthetic fixtures/generators in the repository and generated artifacts in test outputs, without secrets or temporary-path prerequisites.
