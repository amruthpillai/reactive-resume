# Plan 12: Diagnose blank, black, and incomplete resume output at the first failing boundary

> This is a diagnostic plan for five reports, not a proposed shared fix. Follow each issue's branch before editing runtime code. Stop when required source data is missing; report the precise missing fixture. The coordinating maintainer owns index updates and issue disposition.

## Status and intent

- **Issues:** [#3323](https://github.com/amruthpillai/reactive-resume/issues/3323), [#3290](https://github.com/amruthpillai/reactive-resume/issues/3290), [#3033](https://github.com/amruthpillai/reactive-resume/issues/3033), [#3007](https://github.com/amruthpillai/reactive-resume/issues/3007), [#2609](https://github.com/amruthpillai/reactive-resume/issues/2609).
- **Planned at:** `7a98f6662`, 2026-09-05. Priority P1; effort M per reproduced cause; risk medium. Confidence low for historical root causes, high for current source paths below.
- **Readiness:** Investigation ready; no runtime fix selected. Missing original resume/browser/deployment fixtures are material blockers to historical resolution.
- **Dependencies:** None for diagnosis. Coordinate persistence findings with the builder draft owner; font-specific findings with Plan 13. Share reproduction utilities only, unless two reports prove the same failing boundary.
- **Goal:** Distinguish missing saved content, failed PDF generation, invalid/black PDF content, and failed PDF.js display. Each has different ownership and regression requirements.

## Issue-specific facts and required evidence

| Issue | Exact report and relevant history | Evidence still needed |
| --- | --- | --- |
| #3323 | Download succeeds but entered template content is absent. No version, format, template, steps, or output. Maintainer requested clarification twice. A bot's #3076 duplicate suggestion is not evidence. | Input field and text, exported format, exact action sequence, sanitized JSON before/after save, actual download, application revision. |
| #3290 | Cloud preview and downloaded pages are black; template field says None. Maintainer explicitly requested recurrence after #3104. | Original JSON and black PDF; browser/version; whether an independent viewer also shows black pages; design/background/custom styles. |
| #3033 | Ditgar existing resume blank; changing font weight redraws it. Comments separately show `getOrInsertComputed is not a function` and PT Sans blanking on 5.1.4. | Preserve original PT Sans weight selection before editing; exact old browser build for the compatibility subtype; console stack and source JSON. |
| #3007 | Center view absent across templates; changing fonts did not help. Firefox/Zen comments differ from Chrome. Another self-hosted commenter reports AI-provider requests failing without optional encryption configuration. | Browser build and source PDF; minimal resume; actual failing request/stack. Do not copy the comment's example secret into files or logs. AI errors are an unverified separate subtype. |
| #2609 | Self-hosted 5.0.3: Ditto/“Kikorita” do not load when selected. Later commenter separately describes Ditto education spacing, missing accent borders/full-width header, bold descriptions after migration. | Current deployment/browser errors for template loading; matching older/newer JSON and PDFs for visual parity. Do not conflate load failure with intended/accidental template redesign. |

No row is closed by an all-template smoke pass. Fresh issue body/comments were read on the planning date; no newly supplied exact reproduction removed these limitations.

## Current state and ownership

Run first:

```sh
rtk proxy git diff --stat 7a98f6662..HEAD -- apps/web/src/features/resume/preview apps/web/src/features/resume/export apps/web/src/features/resume/builder/draft.ts packages/pdf/src/document.tsx packages/pdf/src/browser.tsx packages/pdf/src/server.tsx packages/pdf/src/hooks/use-register-fonts.ts
```

Inspect drift before using these excerpts. Worktree branches use `codex/`; main stays untouched. Node 24/pnpm 11.21.0, named React props types, package export maps, and separate browser/server adapters apply.

1. `apps/web/src/features/resume/preview/preview.browser.tsx`, `ResumePreviewClient`: `const blob = await createResumePdfBlob(resumeData);` then promotes a staged layer only after pages render. PDF-generation failure keeps the last valid layer and shows `resume-preview-render-error`. A stale visible layer is not proof the latest PDF generated successfully.
2. `preview/pdf-canvas.tsx` imports both API and worker from `pdfjs-dist/legacy/build/...`. `PdfCanvasDocument` logs “Failed to load PDF document”; `PdfCanvasPage` logs “Failed to render PDF page N”. Those are different boundaries. Current canvas setup includes:

   ```ts
   canvas.width = Math.floor(width * renderScale);
   canvas.height = Math.floor(height * renderScale);
   canvasContext.direction = 'ltr';
   // page.render includes background: 'white'
   ```

3. `export/use-resume-export.ts`, `onDownloadPDF`, derives `getResumeExportData(resume.data, target)` for owner downloads, then calls `createResumePdfBlob`; public downloads use `resolvePublicResumePdfBlob`. JSON export serializes `resume.data`. Compare the same export target before declaring lost sections.
4. `export/pdf-document.tsx` resolves localized section titles. `packages/pdf/src/browser.tsx` parses input and calls `pdf(document).toBlob()`. `packages/pdf/src/server.tsx` parses input and calls `renderToBuffer(document)`. Both instantiate `ResumeDocument`; this is an architectural fact, not proof of equivalent cached inputs/fonts.
5. `packages/pdf/src/document.tsx` resolves typography, scripts, stylesheet mode, template component, and authored layout pages. Hidden/unplaced sections can be absent by data semantics; inspect those fields before blaming rendering.
6. `builder/draft.ts`, `flushResumeSave`, serializes pending writes. Do not add a new save path just because an export lacks text. Prove draft, export input, and persisted revision differ first.
7. `packages/pdf/src/hooks/use-register-fonts.ts`, `resolvePdfFontWeights` and `registerFonts`, resolves available weights and aliases. The presence of fallback code does not prove a requested remote font loaded successfully.

## Reproducible control and measurement contract

Use `structuredClone(defaultResumeData)` from `@reactive-resume/schema/resume/default`, set `basics.name = 'Output Boundary Probe'`, hide the picture, set summary to `<p>SUMMARY_SENTINEL_3323</p>`, and make one full-width authored page containing `summary`. Use Helvetica body and heading to remove network fonts from the first control. Repeat template Ditgar, Ditto, Chikorita; then restore the reporter's exact font and data. Set semantic source to `@version 1;` only in the semantic control; retain original styles in the original fixture.

Build `packages/pdf/src/output-boundary.integration.test.tsx` using `semantic/rich-text-table.integration.test.tsx`'s `act`/`renderToBuffer`/PDF.js cleanup pattern. Record document page count, page MediaBox, extracted sentinel text, and operator count. Add rendered pixel checks: text extraction alone can pass while pages look black or glyphs disappear.

For browser production tests, use `tests/e2e/fixtures/test.ts` and the import/save/export patterns already in `tests/e2e/specs/preview-raster-direction.spec.ts`. Capture the actual generated Blob before PDF.js consumes it, plus the separately downloaded PDF; do not compare a screenshot with a newly invented JSON fixture. Persist artifacts through `testInfo.outputPath`/attachments, never a machine-specific path.

Keep a result row per stage: `{issue, appRevision, browserBuild, template, fontFamily, weights, exportTarget, sourceRevision, stage, pageCount, sentinelPresent, rasterInk, errorName}`. Redact cookies, URLs containing credentials, and private content; do not broadly log network response bodies.

## Ordered diagnostic forks

### 1. Establish whether content reached the requested export (#3323)

- Add the sentinel through the reported editor field; export JSON immediately, after save completion, and after reload.
- Compare draft/export JSON with persisted JSON and the selected resume versus cover-letter target. If missing before PDF generation, investigate the actual editor/import/persistence owner and stop changing PDF code.
- If data survives but PDF text is absent, minimize hidden flags, layout placement, content filters, and stylesheet visibility one at a time. Preserve original fixture and compare a style-disabled control.
- If text is in the PDF but invisible in its raster, inspect text color, clipping, and font glyphs; route to the corresponding renderer branch.

**Gate:** a retained regression must assert the sentinel at every relevant boundary and first fail at exactly one boundary. Without the entered field/export format, record missing fixture and stop this issue's implementation.

### 2. Separate black document content from black display (#3290)

- Render the downloaded original PDF in independent PDF.js with a white canvas and with Poppler. Inspect page-filling rectangle/image color operators and transparent backgrounds.
- Compare source `metadata.design.colors.background/text` and authored page styles. A legitimate black background is not a bug; determine why text is unreadable if so.
- If independent render is correct but preview black, preserve those exact PDF bytes as a viewer regression fixture. Minimize PDF.js load/render and canvas dimensions before changing template colors.
- If all independent viewers show black, inspect generator styles/font errors and compare server versus browser output from identical data. A UI background patch cannot fix black PDF content.

**Gate:** assert a known text region contains foreground pixels and background has the expected color; do not use merely `inkPixels > 0`, which an all-black rectangle satisfies.

### 3. Split compatibility and font failures (#3033)

- Reproduce the stack in the exact reported engine version. Current legacy entrypoint tests protect import choice; they do not emulate every older engine. Verify worker and main module load under the same compatibility target.
- For PT Sans, preserve original weights, change one weight, switch away/back, and repeat fresh/warm sessions. Record font response status and actual embedded font names. Create a direct PDF control with the same family/weights to distinguish generation from display.
- Only if compatibility fails, change the narrow entrypoint/polyfill build seam and retain an engine-level production test. Only if font resolution fails, modify family/weight/source resolution with a regression for the failing face. Do not remove PT Sans from the catalogue or alias it to another font as a workaround.

**Gate:** both original font case and compatibility case receive separate results. Passing one must not mark the other fixed.

### 4. Isolate engine and unrelated optional-service errors (#3007)

- Use clean Chromium, Firefox, and reported Zen builds with the same controlled PDF and JSON, extensions off. Record whether failure occurs before generation, worker startup, or canvas render.
- In a dedicated local configuration, run the same resume without optional AI credentials and observe whether preview generation still starts. A failing AI-provider request alone does not establish render blockage; locate its actual awaited dependency before proposing a fix.
- If optional service failure is shown to block unrelated preview, change only the owning error boundary/query dependency and test both disabled and configured service states. Otherwise keep it as a separate deployment diagnostic.

**Gate:** engine-specific failure must use identical input bytes; optional-config cause needs a test showing toggling only that configuration changes preview success. Never publish secret values from issue comments.

### 5. Distinguish template selection from template geometry (#2609)

- Select Ditto and Chikorita in production, assert saved `metadata.template`, active preview `data-resume-preview-template`, nonempty exported PDF, and no worker/font/module error.
- For the later visual subtype, preserve old/new output and compare Education item boundaries, full-width header, accent line drawings, and `<strong>` weights independently. A changed template design requires maintainer parity decision, not automatic restoration of all old CSS.

**Gate:** selection regression asserts active template and sentinel content. Visual regressions need exact original layout or explicit design acceptance; do not substitute the smoke fixture for it.

## Implementation boundaries and commands

Initially add only the output-boundary integration test and `tests/e2e/specs/output-boundary.spec.ts`. A runtime edit requires a reproduced red assertion and a narrowed file list reviewed by the maintainer. Candidate owners are the exact files above; no schema migrations, bulk font replacement, generic cache clearing, or cross-package source imports.

```sh
rtk proxy pnpm --filter web exec vitest run src/features/resume/preview/pdfjs-legacy-entrypoints.test.ts src/features/resume/preview/preview.browser.test.tsx src/features/resume/export/use-resume-export.test.tsx
rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/output-boundary.integration.test.tsx src/semantic/all-templates-smoke.test.tsx
rtk proxy pnpm --filter web typecheck
rtk proxy pnpm --filter @reactive-resume/pdf typecheck
rtk proxy pnpm exec turbo boundaries
rtk proxy pnpm build
rtk proxy dotenvx run -f .env.local -- pnpm exec playwright test tests/e2e/specs/output-boundary.spec.ts --reporter=list
```

New test filenames are proposed additions; create them before running those commands. All commands must exit 0. For production E2E, use a unique port, disposable account, and dedicated database; `.env.local` must never point to user data. `pnpm check` writes files: inspect changes after running it. Do not push or open a PR without executor authorization; never merge.

## Completion and STOP conditions

- [ ] #3323: first lost-data boundary identified using exact input/format, or precise missing input documented.
- [ ] #3290: downloaded PDF independently rasterized and black content/display distinguished.
- [ ] #3033: engine compatibility and PT Sans weight results recorded independently.
- [ ] #3007: browser comparison and optional-AI dependency hypothesis separated with evidence.
- [ ] #2609: template selection and later visual-parity subclaims each assessed.
- [ ] Any fix has a failing-before/passing-after behavioral test and production export evidence; generic smoke success is not historical closure.

Stop on absent original fixtures, source drift, a second failed verification attempt without a new hypothesis, or required changes outside the proven owner. Preserve the last valid preview/error behavior. Record uncertainty rather than removing reports because old versions differ.
