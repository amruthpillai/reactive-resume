# Plan 18: Measure preview and downloaded page geometry from identical resume data

> The shared document component is not proof of visual parity. This plan first distinguishes different page bytes from display scaling/clipping. No runtime fix is selected without a failing measured comparison.

## Status and evidence

- **Issue:** [#2683](https://github.com/amruthpillai/reactive-resume/issues/2683).
- **Planned at:** `7a98f6662`, 2026-09-05. Priority P2; effort M; risk medium for preview geometry, high for page sizing changes.
- **Report:** Cloud Rhyhorn playground appears to have no bottom space, while downloaded PDF has bottom space. Attachment is a video; no source JSON, page settings, browser, or exact output supplied. No comment establishes a current reproduction.
- **Confidence/readiness:** Current source high confidence; original cause low confidence. Diagnostic plan ready; implementation requires exact data or a separately reproduced defect.
- **Dependencies:** Existing shared page-size/margin and preview direction fixes. Coordinate any approved page-policy change with Plan23; picture-specific display checks belong to Plan15.

## Current state and source gate

```sh
rtk proxy git diff --stat 7a98f6662..HEAD -- apps/web/src/features/resume/preview apps/web/src/features/resume/export packages/pdf/src/document.tsx packages/pdf/src/templates/shared/page-size.ts packages/pdf/src/templates/rhyhorn
```

Read drift before using excerpts. Runtime imports must use package exports; browser APIs stay in web preview code.

- `packages/pdf/src/document.tsx`, `ResumeDocument`, calculates page size from `metadata.page.format` and renders each authored `metadata.layout.pages` entry. Physical overflow pages can differ from authored page count.
- `templates/shared/page-size.ts`:

  ```ts
  if (format === 'free-form') return { width: 595.28 };
  if (format === 'letter') return 'LETTER';
  return 'A4';
  // free-form minimum height is 841.89 points
  ```

- `preview/pdf-canvas.tsx`, `PdfCanvasPage`, gets actual page viewport at scale1, reports `{height,width}`, uses pageScale for CSS width/height, and allocates bitmap dimensions with `getPreviewCanvasScale`. The wrapper applies `scaledPageSize` and `overflow-hidden`. A stale/default wrapper size is a hypothesis to measure, not a proven bug.
- `preview/preview.browser.tsx` tracks pageSizes per generated PDF layer and retains the previous active layer until replacement renders. Capture the active layer after update, not an exiting/staged page.
- `export/use-resume-export.ts`, owner `onDownloadPDF`, calls `getResumeExportData(resume.data, target)` before generating. Print uses the complete resume. Cover-letter targeting can change data and must be held constant.
- Browser/server adapters both construct `ResumeDocument` after schema parsing, but generate separate bytes. Font availability, source revisions, target, and layout options still require comparison.

Initial allowed changes: a new `tests/e2e/specs/preview-export-geometry.spec.ts` and focused test additions in `preview.shared.helpers.test.ts` or `page-size.test.ts` if a pure calculation fails. Runtime candidate files are the exact sources above. Do not alter Rhyhorn margin defaults, page format, content, or authored pagination merely to make a screenshot look fuller.

## Portable controls

Clone `defaultResumeData`, set template Rhyhorn, hide picture, Helvetica body/heading, one full-width page containing summary. Set summary `<p>TOP_SENTINEL</p>` followed by20 paragraphs `Geometry line N` and final `<p>BOTTOM_SENTINEL</p>`. Keep authored margins from defaults in one case and set marginY15 in another. Repeat formats `a4`, `letter`, `free-form`; repeat enough paragraphs to overflow physically. The synthetic control diagnoses geometry but is not the original video fixture.

Required original fixture: sanitized JSON retaining format/margins/layout/styles/font/content lengths, actual downloaded PDF, viewport/DPR/browser zoom, builder zoom and UI screenshot/video timestamp. Without those, keep historical #2683 unresolved.

## Ordered diagnostic work

### 1. Capture identical input and identify each PDF

Use `tests/e2e/fixtures/test.ts` account cleanup; import controlled JSON, wait for autosave/reload, capture active preview PDF bytes using the Blob interception pattern in `preview-raster-direction.spec.ts`, then Download PDF with resume target. Save both under `testInfo.outputPath`. Read stored JSON to verify same revision/target.

For each PDF record physical page count, each MediaBox width/height, last non-background ink y coordinate, BOTTOM_SENTINEL page/y, and footer/background bounds. Do not compare PDF hashes because creation timestamps can differ despite identical layout.

**Gate:** source JSON/target match. If source differs, route to export/persistence before changing canvas/page geometry.

### 2. Distinguish physical blank space from display clipping

Render downloaded PDF with the same PDF.js version, canvas dimensions, background, direction and scale as active preview. Compare all RGBA pixels; reuse sibling-canvas setup from `preview-raster-direction.spec.ts`, deriving transform for current page scale. Record CSS bounding box, scroll viewport clip, canvas bitmap size and wrapper dimensions.

Compute physical bottom whitespace as `pageHeight - bottomInkY`, excluding full-page background rectangles. Convert displayed whitespace to points using measured CSS scale before comparing. Check all pages, not only the first.

If PDFs have equal boxes/content coordinates but displayed bottoms differ, isolate wrapper/transform/viewport clipping. If PDF boxes differ, isolate format/options. If boxes match but content y differs, compare generated styles/fonts. A zoomed page extending below viewport is expected scrolling behavior unless controls claim fit-page.

**Gate:** one measured mismatch identifies the first incorrect value. Add desired assertion that fails on baseline before touching runtime code; if all controls pass, record bounded negative evidence and request original fixture through maintainer, without posting a new issue comment.

### 3. Implement only that boundary

For stale page-size state, key measured dimensions to the actual PDF layer/page and preserve old valid preview until replacement; test fast A4→Letter→free-form transitions. For scale calculation, use actual viewport rather than assumed A4 dimensions. For export option mismatch, use shared explicit options and test target selection. Any proposal to change default margins/free-form policy requires a separate product decision.

**Gate:** same-source same-target PDF coordinates match; active preview/reference pixels match; overflow pages remain reachable and content unchanged. A deliberately overflowing control must not lose the final sentinel.

## Commands and acceptance

```sh
rtk proxy pnpm --filter web exec vitest run src/features/resume/preview/preview.shared.helpers.test.ts src/features/resume/preview/preview.browser.test.tsx
rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/templates/shared/page-size.test.ts src/templates/shared/page-margins.test.tsx
rtk proxy pnpm --filter web typecheck
rtk proxy pnpm --filter @reactive-resume/pdf typecheck
rtk proxy pnpm exec turbo boundaries
rtk proxy pnpm build
rtk proxy dotenvx run -f .env.local -- pnpm exec playwright test tests/e2e/specs/preview-export-geometry.spec.ts --reporter=list
```

All commands exit0; new spec must exist before running it. Production server uses dedicated test database and unique port, never user data. Test A4/Letter/free-form, single/overflow pages, zoom75/100/115%, and one DPR1/DPR2 comparison. Wait for settled transforms. Independent Poppler raster helps distinguish generator from PDF.js behavior; antialiasing differences alone are not geometry defects.

- [ ] Original video report has exact reproduction or explicit missing-fixture disposition.
- [ ] Both PDFs' physical boxes and final content positions measured; no screenshot-only conclusion.
- [ ] Actual active preview/reference comparison covers all physical pages and format changes.
- [ ] No data/margin/pagination policy change concealed as a viewer fix.

Stop on unavailable original data when claiming historical closure, unexplained font/source differences, or a proposed fix requiring global page defaults. Run write-capable `pnpm check` with diff review before authorized commit. Independent review precedes publication; never merge. Maintainer owns index and issue closure.
