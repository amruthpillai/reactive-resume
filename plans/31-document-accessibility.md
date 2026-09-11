# Plan 31: Verify document accessibility and enhance only confirmed gaps

## Selected direction and authority

Agent judgment: enhance the existing accessible outline with entry headings and safe rich-text lists for builder/public HTML; audit PDF tagging separately. Q3 explicitly requires retaining section labels in the screen-reader outline even when visible headings are disabled. Preserve the existing stable section order. Use H3 for entries/companies and H4 only for subordinate roles; omit empty headings and keep hidden content absent.

Reuse the existing component on public HTML only after measuring PDF.js announcements, ensuring there is exactly one coherent reading surface. No tagged-PDF conformance target is implied.

## Status and execution boundary

- **Issue:** [#2844](https://github.com/amruthpillai/reactive-resume/issues/2844).
- **Planned at:** `7a98f6662`, 2026-09-05. Priority P2; effort M for the existing HTML mirror, L for export accessibility; risk medium.
- **Readiness:** Direction selected above. Ready for later execution after the technical verification gates; this task remains documentation-only.
- **Evidence confidence:** High for the source facts below; unknown for PDF tagging and assistive-technology behavior until actual output is inspected. The issue requests H1 name, H2 sections, H3 companies, H4 job titles, lists, and labels. The owner requested an exact output and acceptance criteria on 2026-08-16; the issue has not supplied a focused fixture.
- **Dependencies:** None for verification. Coordinate with plan 20 for hidden/unplaced sections, plan 21 for hidden headings, and plan 30 for exported text measurements. Their behavior must not silently redefine this plan's reading order.

## Current state

Run `rtk proxy git diff --stat 7a98f6662..HEAD -- apps/web/src/features/resume/preview apps/web/src/features/resume/public packages/docx packages/pdf` first. If source changed, compare the following anchors before proceeding.

- `apps/web/src/features/resume/preview/resume-accessible-text.tsx:248`, `ResumeAccessibleText`, is an existing visually hidden HTML mirror. It renders a section with the `sr-only` class and localized “Resume content” accessible label, the name as `<h1>`, and section names as `<h2>`.
- `AccessibleSection` around line 219 filters hidden sections, hidden items, and empty item arrays, then renders `<ul><li>…</li></ul>`. Contacts also use a list and real mailto/tel/website links.
- `ItemBody` renders combined primary values in a paragraph. Experience combines position and company, and role progression uses a nested list. There are no item H3/H4 elements.
- Descriptions and summary call `stripHtml(...)` and insert the result into a paragraph. This loses rich-text list, emphasis, and heading structure; existing outer section lists do not repair nested description lists.
- `SECTION_ORDER` is a fixed order. Its comment explicitly favors stable, complete reading order over matching PDF columns. Do not equate an unplaced section with a hidden section without approval.
- `apps/web/src/features/resume/preview/preview.browser.tsx:165` and `:180` already mount this mirror for builder previews. The component's comment states that it does not affect PDF/export generation.
- `apps/web/src/features/resume/public/pdf-viewer.tsx` creates PDF.js `PDFViewer` with annotations and a text layer. It does not mount `ResumeAccessibleText`. Source alone does not prove what a screen reader announces from PDF.js.
- `packages/docx/src/builder.ts:152` uses `HeadingLevel.TITLE` for the name. `packages/docx/src/section-renderers.ts` uses Word paragraph/heading constructs. DOCX is not an HTML serialization; inspect the generated package before diagnosing heading gaps.

## Output contract

Enhance the existing builder/public HTML outline: H3 for company/entry, H4 for subordinate roles, safe nested lists, current stable section order, and no empty headings. Q3 is an explicit maintainer decision: the Show heading option hides visual headings but must retain accessible section labels. PDF tag quality and DOCX styles are audited independently; neither requires a new conformance target for this increment.

## Allowed files

Diagnostic tests may be added as `apps/web/src/features/resume/preview/resume-accessible-text.test.tsx` and `tests/e2e/specs/document-accessibility.spec.ts`. The HTML fix belongs in the existing `resume-accessible-text.tsx` and a narrowly scoped sibling rich-text renderer if needed. Public viewer composition may reuse the existing outline with its current authorized data. DOCX remains diagnostic in this plan; a demonstrated export gap requires a separately scoped follow-up. No schema, API, auth, PDF styling, or persisted layout mutation is needed for the HTML mirror.

## Ordered work and gates

1. **Build synthetic fixtures and characterize existing behavior.** Clone `sampleResumeData` from `@reactive-resume/schema/resume/sample`. Include one hidden built-in, one hidden custom item, a visible unplaced section, two roles at one company, blank optional values, a contact link with a label, and `<ul><li>First bullet</li><li>Second bullet</li></ul>` in a description. Render `<ResumeAccessibleText data={data} />` in the existing Lingui test-provider pattern from `preview.browser.test.tsx`. Assert name H1 and section H2 already exist; after plan 21 lands, set Show heading false and assert its H2 accessible label still exists under Q3. Assert hidden content is absent, contacts have accessible names, and each visible token appears once. Record current description list flattening and lack of item headings as characterization, not new passing acceptance tests.

   **Gate:** `rtk proxy pnpm --filter web exec vitest run src/features/resume/preview/resume-accessible-text.test.tsx src/features/resume/preview/preview.browser.test.tsx` exits 0 with the characterization matrix represented.

2. **Measure each requested output independently.** Add a Playwright test using `tests/e2e/fixtures/test.ts` and its disposable account cleanup. Capture the builder's accessible DOM, public viewer DOM, PDF bytes, and DOCX bytes generated from the same fixture. Record `pageerror` events. For PDF, inspect PDF.js `getStructTree()` per page and text order; absence of tags is evidence about that output, not permission to replace the PDF engine. For DOCX, unzip into `testInfo.outputPath(...)`, inspect paragraph style references and list numbering, and run an available document accessibility checker. Record tool/version and missing capability honestly. Do not claim WCAG/PDF-UA compliance from an axe scan or a heading count alone.

   **Gate:** `rtk proxy pnpm exec playwright test tests/e2e/specs/document-accessibility.spec.ts --project=chromium` exits 0 for diagnostic assertions; output artifacts show which of the four surfaces was measured. This requires `rtk proxy pnpm build` first and an operator-provided dedicated E2E `.env.local`, loaded with `rtk proxy dotenvx run -f .env.local -- pnpm exec playwright test ...`. Never use a production database.

3. **Implement the selected HTML residuals.** Add failing DOM tests for the selected hierarchy and nested description lists. Preserve semantic `<ul>`, `<ol>`, `<li>`, paragraphs, and emphasis using an explicit allowlist; do not use unsanitized `dangerouslySetInnerHTML`. First inspect existing sanitized rich-text utilities and use a suitable one rather than importing PDF internals into the web app. Unknown tags become safe text; scripts, event attributes, and unsafe link schemes must never execute. Keep names/companies as text nodes. Preserve duplicate suppression, hidden filtering, and the agreed reading order.

   **Gate:** The same focused command must show the new tests failing before implementation and passing afterward. Add script/unsafe-link fixtures, nested lists, multiline descriptions, empty company/position, and role progression. If a safe existing utility cannot satisfy the selected semantics without a new cross-package API, stop and propose that API.

4. **Integrate public HTML and validate real assistive use.** In `apps/web/src/features/resume/public/pdf-viewer.tsx` or its owning public wrapper, reuse the same outline exactly once using already authorized data. Measure PDF.js text-layer announcements before adding it; expose one coherent reading route without disabling visible/selectable text or keyboard-operable links. A simple unconditional duplicate screen-reader surface fails acceptance. Do not widen public data authorization. With the synthetic fixture, use a screen reader available to the operator to navigate headings, links, and list items in the builder. Document exact observed sequence and whether the raster canvas is announced twice. Repeat after edits and undo. Automated accessibility checks supplement this evidence; they do not replace it.

   **Gate:** `rtk proxy pnpm --filter web typecheck`, `rtk proxy pnpm exec turbo boundaries`, and `rtk proxy git diff --check` all exit 0. A recorded manual transcript must contain the selected headings and both description bullets exactly once.

## Baseline verification performed

At planning time, five existing web test files covering preview and import passed (23 tests, 2.83 seconds). This only verifies the existing tests; there is no dedicated mirror accessibility test at this baseline. No screen-reader or export-tag compliance claim has been made.

## Done criteria

- [ ] Selected HTML scope/hierarchy and Q3 accessible label preservation are encoded in tests.
- [ ] Existing H1/H2/list behavior is preserved and covered; no duplicate mirror is introduced.
- [ ] Hidden-content and description-list tests pass with the agreed hierarchy.
- [ ] Every claimed output has its own measured evidence; unmeasured PDF/DOCX compliance remains explicitly open.
- [ ] Focused tests, web typecheck, boundaries, and diff check pass; only in-scope files change.

## STOP conditions and handoff

Stop if public data authorization would need changing, source drift invalidates the mirror contract, PDF tagging requires an engine replacement, or two attempted fixes fail the same verification. Do not close #2844 solely because builder headings improve. Keep generated fixtures in repository tests and outputs in test artifacts; no private resumes or temporary-file prerequisites. Use a fresh `codex/issue-2844-accessibility` worktree for future code; do not push, comment on the issue, or merge without later authorization. The coordinator maintains the plan index.
