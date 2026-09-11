# Plan 14: Separate RTL PDF shaping and layout from the corrected canvas display

> Diagnose first. The canvas-direction fix is already merged; do not reimplement it or treat its success as proof that Arabic, Hebrew, and Persian exports are correct. Index and issue disposition remain with the maintainer.

## Status and evidence

- **Issue:** [#3275](https://github.com/amruthpillai/reactive-resume/issues/3275).
- **Planned at:** `7a98f6662`, 2026-09-05. Priority P2; effort L; risk high for shaping/fallback changes, medium for template-local alignment.
- **Readiness/confidence:** Diagnostic plan ready; historical cause unverified. Report says self-hosted Arabic PDF direction, alignment, shaping, and section layout are inconsistent, with Hebrew/Persian also affected. It supplies a screenshot but no exact JSON, font, template, or deployment version.
- **Prior work:** #3099 addressed Rhyhorn and does not establish all-template/script correctness. #3447 corrected a separately reproduced builder canvas bug: inherited RTL canvas direction changed physical text anchors. Two Arabic-locale controls differed by 35,009 pixels before that fix, English controls matched; setting canvas context direction after resize restored exact parity. Broader exported-PDF claims remain open.
- **Dependencies:** Merged #3447 and existing script fallbacks. Coordinate font/glyph work with Plan 13, paragraph/literal-space behavior with Plan 19. No dependency justifies automatic changes to every template.

## Current source and scope

```sh
rtk proxy git diff --stat 7a98f6662..HEAD -- apps/web/src/features/resume/preview/pdf-canvas.tsx packages/pdf/src/hooks/use-register-fonts.ts packages/pdf/src/templates/shared/rtl.ts packages/pdf/src/templates/shared/rich-text-html.ts packages/pdf/src/templates/shared/rich-text-renderers.ts tests/e2e/specs/preview-raster-direction.spec.ts
```

Stop on relevant drift until the live contract is reconciled. Source anchors:

- `pdf-canvas.tsx`, `PdfCanvasPage`, sets dimensions first, then `canvasContext.direction = "ltr"`, then calls PDF.js. This concerns physical raster coordinates; it must stay LTR even inside RTL content.
- `preview.browser.tsx` sets the resume page container's `dir` from `resumeData.metadata.page.locale`. UI locale and resume locale are independent inputs; do not use UI language as the resume-direction source.
- `packages/pdf/src/templates/shared/rtl.ts`, `createRtlStyleHelpers`:

  ```ts
  row: rtl ? 'row-reverse' : 'row',
  text: rtl ? { direction: 'rtl', textAlign: 'right' } : {},
  anchorToStart: (offset = 0) => rtl ? { right: offset } : { left: offset },
  ```

- `hooks/use-register-fonts.ts` detects Arabic ranges including Persian, Hebrew, Thai, CJK, and emoji. `registerFonts` applies per-character breaking only to CJK words; extending that to Arabic destroys joining.
- `templates/shared/rich-text-html.ts`, `normalizeRichTextHtml`, converts RTL pseudo-bullets and inserts RLM at independent paragraph/list-item frames. `rich-text-renderers.ts` owns paragraph/list text behavior. Do not add invisible marks globally before identifying the frame that fails.
- `tests/e2e/specs/preview-raster-direction.spec.ts` captures actual PDF bytes, independently renders the same bytes in a sibling canvas with `context.direction = "ltr"`, and compares all RGBA pixels. It tests English/Arabic UI crossed with en-US/ar-SA resume. Its fixed transform `[4,0,0,4,0,0]` is valid for its controlled preview scale; derive the current scale when expanding its matrix.

Initial allowed additions: `packages/pdf/src/rtl-export.integration.test.tsx` and an expanded production RTL test. Runtime scope after reproduction: exact shared helper or affected template page, not every template. Font fallback modifications require proof of missing glyph coverage. Do not alter stored text ordering, transliterate user content, or mirror PDF.js coordinates.

## Portable script controls

Clone `defaultResumeData`, hide picture, place summary and profiles on one page, and create separate records for these literal strings:

| Resume locale | Control text | Property to inspect |
| --- | --- | --- |
| ar-SA | `مهندس برمجيات — Software Engineer 2026` | Arabic joining and Latin/number run order |
| he-IL | `מפתח תוכנה — Software Engineer 2026` | Hebrew word order, punctuation, right alignment |
| fa-IR | `توسعه‌دهنده نرم‌افزار — ۲۰۲۶` | Persian letters/digits and the literal ZWNJ between words |
| en-US | `Software Engineer — 2026` | Unchanged LTR control |

Use body family IBM Plex Serif first to exercise the configured script fallback, then the exact reporter font when supplied. These strings are synthetic diagnostics; correct linguistic appearance requires comparison with a known-good shaping reference and competent script review, not guessing from extracted Unicode.

Add `<p>...</p>`, `<ol><li>...</li><li>Second 123</li></ol>`, a multi-line heading, email `person@example.com`, and a mixed-script URL label. Start with Rhyhorn and one other affected template from the reporter, then expand only if a shared defect is proved. Include both stylesheet modes and sidebar/main placement. Do not declare all templates covered by two controls.

## Ordered execution and gates

### 1. Preserve exact report data and locate the failing surface

Read issue body/comments using `rtk proxy gh issue view 3275 --repo amruthpillai/reactive-resume --json body,comments`; do not post a comment. Required fixture: sanitized JSON retaining locale/font/styles/template, actual exported PDF, browser/build, and identified incorrect words/regions. If absent, record exact limits and run controlled diagnostics only.

Generate browser and server PDFs from identical saved data. Compare actual preview to an independent render of each downloaded PDF. If only preview differs, retain exact PDF bytes and investigate viewer code; if both PDFs are wrong, proceed to shaping/layout. If only one generated PDF is wrong, compare selected font files/cache state before template changes.

**Gate:** label each artifact `preview`, `browser-pdf`, or `server-pdf`, and record same source revision. Pixel equality for the same bytes proves viewer parity only.

### 2. Separate glyph, bidi, and template geometry

- Glyph absent/box: inspect resolved font family and font coverage; do not treat missing glyph as a flex-direction bug.
- Correct characters but unjoined Arabic/Persian: inspect shaping runs and whether line breaking split joined sequences. Preserve ZWNJ/ZWJ meaning and marks; retain glyph-cache regressions.
- Correct shaped words but wrong mixed-run order: minimize bidi paragraph boundaries and punctuation. Compare literal codepoints before/after HTML normalization; avoid reversing strings manually.
- Correct text but misplaced header/section/date: inspect the owning template's `createRtlStyleHelpers` usage and resolved style. Patch that template if the defect is local.
- Nested RTL lists flattening already exists in controlled marker/indentation baselines; do not claim a new global fix without a separate red case and bounded design.

**Gate:** one actual-PDF assertion or annotated raster region identifies one failure class. Run `rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/rtl-export.integration.test.tsx src/rtl-fixture.test.ts src/templates/shared/rtl.test.ts`; new desired assertion must fail before code change while retained tests pass.

### 3. Implement the narrow branch and preserve independent contracts

For template geometry, use logical helpers rather than hard-coded left/right overrides; preserve LTR fixtures. For fallback coverage, register only missing script faces through the existing font package API, preserving regular/bold and content detection. For shaping, require exact font/glyph sequence evidence and isolated dependency patch tests, CJS/ESM parity, and frozen-install validation. No generic `direction: rtl` wrapper around all text.

**Gate:** exact failing script/template passes; LTR and the other two RTL controls preserve text, page count, and intended alignment. Do not assert visual correctness from extracted text alone.

### 4. Production acceptance

Use disposable authenticated fixture and dedicated database/port. Cross English/Arabic UI with all four resume locales; fresh session and warm session after another script; actual browser/server download. Wait for active preview layer and settled zoom before raster capture.

```sh
rtk proxy pnpm --filter @reactive-resume/pdf typecheck
rtk proxy pnpm --filter web typecheck
rtk proxy pnpm exec turbo boundaries
rtk proxy pnpm build
rtk proxy dotenvx run -f .env.local -- pnpm exec playwright test tests/e2e/specs/preview-raster-direction.spec.ts --reporter=list
```

All commands exit 0. Same-byte PDF.js comparison must have zero differing pixels when matched scale/styles apply. Independent Poppler/browser rendering may differ in antialiasing: compare glyph bounds and reviewed shaping instead of demanding identical engine pixels.

## Done / STOP

- [ ] Arabic, Hebrew, Persian claims each get exact-fixture or explicitly controlled-only disposition.
- [ ] UI direction, resume direction, glyph coverage, shaping, bidi, and template placement are measured separately.
- [ ] Existing LTR physical canvas direction and CJK-only line breaking remain intact.
- [ ] Regression covers the proved failure, both export adapters, and preserved LTR behavior.

Stop without a known-good shaping reference for a proposed character-order change, on missing exact fixture when claiming historical resolution, or if a local defect demands unreviewed global template changes. Independent review before authorized PR publication; never merge. The maintainer decides issue closure.
