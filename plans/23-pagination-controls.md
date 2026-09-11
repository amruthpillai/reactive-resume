# Plan 23: Separate authored page controls from item pagination and physical overflow

## Selected direction and authority

Q10 explicitly approves guidance for authored pages and full-width continuations; independent physical overflow editing is excluded. Agent judgment for #3350: add per-item Keep together where safe, preserve current defaults, and keep widow/orphan controls in existing Semantic CSS for this increment. Safe handling of oversized items is a technical gate.

Implement the Q10 guidance independently. Implement item controls only after proving no content clipping; no new widow/orphan UI in this increment.

## Status

- **Issues:** [#3350](https://github.com/amruthpillai/reactive-resume/issues/3350), [#3090](https://github.com/amruthpillai/reactive-resume/issues/3090).
- **Planned at:** `7a98f6662`, 2026-09-05.
- **Priority / effort / risk:** P2 / L / high: incorrect keep-together behavior can clip content.
- **Readiness:** Direction selected above. Ready for later execution after the technical verification gates; this task remains documentation-only.
- **Evidence:** #3350 requests keep-together per item and minimum widow/orphan lines. #3090 reports Azurill overflow pages cannot independently become full-width. An owner explanation quoted in #3090 says automatic overflow follows PDF engine behavior; manually authored pages and free-form output are existing alternatives. Do not treat those two issues as one missing checkbox.

## Current state and evidence

Drift check: `rtk proxy git diff --stat 7a98f6662..HEAD -- packages/schema/src/resume/data.ts packages/pdf/src/document.tsx packages/pdf/src/templates/shared/sections.tsx packages/pdf/src/semantic/pagination.test.tsx apps/web/src/routes/builder`.

- `baseItemSchema` in `packages/schema/src/resume/data.ts:114` stores ID and hidden state; there is no item keepTogether field.
- Summary and `baseSectionSchema` already have `keepTogether` and `startOnNewPage`.
- `apps/web/src/routes/builder/$resumeId/-sidebar/right/sections/layout/pages.tsx:536` implements per-section controls. The current UI is not missing section-level Keep together.
- `packages/pdf/src/templates/shared/sections.tsx:335`: `if (keepTogether) breakProps.wrap = false;`. Its comment states a section taller than a page can clip; do not blindly apply this to tall items.
- `metadata.layout.pages[*]` stores authored page columns and fullWidth. PDF rendering can create more physical pages through wrapping. `packages/pdf/src/semantic/pagination.test.tsx` explicitly constructs overflow and reads physical pages, making it the right regression harness.
- Semantic CSS exposes PDF flow controls and authored page selectors. A selector for authored page 1 is not automatically an editable record for physical overflow page 2.

## Scope and dependencies

Two independently gated deliverables may share diagnostic fixtures but should remain separate implementation units: (A) item pagination controls in schema/editor/shared item renderer; (B) the Q10 explanation and authored-page continuation workflow in Layout. Do not replace the PDF layout engine, persist renderer-generated pages during render, or add data to the database outside normal drafts. Coordinate plan 21's continuation heading suppression.

## Ordered work and verification

### 1. Measure the current page boundary cases

Add fixtures to a new `packages/pdf/src/templates/shared/item-pagination.test.tsx`, following `semantic/pagination.test.tsx`. Use standard fonts and synthetic numbered description lines. Cases: an item that fits remaining space; fits a full page but not the remainder; is taller than a page; a two-line paragraph near the boundary; an item with nested bullets; and an Azurill sidebar plus main-column overflow. Extract all physical page text and assert every numbered token exists exactly once.

**Gate:** `rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/semantic/pagination.test.tsx src/templates/shared/item-pagination.test.tsx` gives a baseline matrix with exact page counts/token placement. A clipped token is a blocking failure, not an acceptable screenshot difference.

### 2. Keep the two implementation contracts separate

For #3350, add the optional item flag to the shared base item model so built-in and custom entries share it; expose it in their existing item menus. Keep widow/orphan controls in Semantic CSS and document that this part of the request remains a deferred UI enhancement. Oversized items must still split without token loss. For #3090, Q10 selects guidance using existing authored-page controls; do not implement independent physical overflow layout.

**Gate:** The test matrix distinguishes item Keep together from authored-page guidance. Independent physical-page editing remains out of scope under Q10; no additional routine product answer is needed.

### 3. Implement selected item controls only after overflow safety is demonstrated

Add `keepTogether: z.boolean().catch(false)` at the shared base item schema boundary once the oversized-item fallback has a proven implementation. Extend existing item menus rather than section menus. Resolve it once in shared `SectionItem` flow props and include custom sections. Never unconditionally set `wrap={false}` on an item that can exceed page height unless a safe fallback has been proven. If the engine cannot provide the required safe fallback, report that limitation and defer the control. Do not estimate line count from HTML string length.

For existing widow/orphan CSS, verify supported renderer text-flow properties at actual text nodes; keep the behavior unchanged. Do not add numeric controls or assume View properties affect Text descendants.

**Gate:** New tests fail before the selected behavior exists, then pass for all fit/overflow cases; every numbered token survives, including the oversized item. Web tests show undo/persistence and disabled locked controls. `rtk proxy pnpm --filter @reactive-resume/schema test` and PDF/web typechecks pass.

### 4. Implement the approved #3090 explanatory path

Add concise Layout guidance identifying authored pages and explaining automatic overflow. Link existing Move to → New Page and full-width controls using their real UI names. Do not label an overflow count as an editable saved page. Add a UI test with one authored page and multiple rendered pages proving the guidance does not add or mutate page records.

**Gate:** Existing `layout/pages.test.tsx` passes plus the new authored/physical distinction test; the Azurill fixture retains all content and the manually authored second full-width page behaves independently.

## Done criteria

- [ ] #3350 has lossless item behavior plus an explicit deferred widow/orphan-UI limit; #3090 follows Q10.
- [ ] Existing section-level controls remain intact; new item behavior cannot silently clip tall content.
- [ ] Every numbered fixture token appears once across physical pages.
- [ ] UI labels and persisted authored page records match the chosen model; no renderer-generated pages are silently saved.

## Issue-specific STOP conditions

Stop if a keepTogether flag clips a tall item, if physical pages require a renderer rewrite, if widow/orphan properties are unsupported in the installed renderer. Do not claim full #3350 coverage while widow/orphan UI is deferred. Never report both issues fixed from a single section-level checkbox test.

## Executor rules and final gates

This remains documentation-only planning. The selected direction above may guide a later explicitly dispatched implementation; it does not authorize source changes during the present planning task. Agent judgments are not maintainer approvals. Follow recorded maintainer decisions when they differ. Use a fresh `codex/` worktree, leave other owners’ changes untouched, and never merge. The coordinator maintains the index. Do not post GitHub issue comments.

Before future code edits, run `rtk proxy git status --short` and `rtk proxy pnpm dlx @tanstack/intent@latest list`; load the most specific matching installed skill. Use package exports for cross-package imports. Resume schema changes start in `packages/schema`; pure resume behavior belongs in `packages/resume`; PDF code belongs in `packages/pdf`; editor controls belong in `apps/web`. Use `useUpdateResumeData` for builder mutations so undo and autosave participate. New visible strings use Lingui.

Run the focused commands, affected package typechecks, `rtk proxy pnpm exec turbo boundaries`, and `rtk proxy git diff --check`; each must exit 0. Use read-only Biome inspection on changed files, or explicitly acknowledge that `rtk proxy pnpm check` writes files and inspect its entire diff. Missing fixtures, failed commands, and unavailable checkers remain unresolved gates. Stop for contradicting source drift, unsafe data behavior, required scope expansion, or the same verification failure twice. Keep synthetic fixtures/generators in the repository and generated artifacts in test outputs, without secrets or temporary-path prerequisites.
