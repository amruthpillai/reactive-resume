# Plan 13: Reproduce remaining font, glyph, and spacing reports without undoing verified fixes

> Each issue has a separate acceptance gate. Shared typography code is not evidence of a shared cause. Run retained regressions before adding another metric or whitespace patch. Index and issue status updates belong to the coordinating maintainer.

## Status

- **Issues:** [#3249](https://github.com/amruthpillai/reactive-resume/issues/3249), [#3159](https://github.com/amruthpillai/reactive-resume/issues/3159), [#3147](https://github.com/amruthpillai/reactive-resume/issues/3147), [#3093](https://github.com/amruthpillai/reactive-resume/issues/3093), [#3089](https://github.com/amruthpillai/reactive-resume/issues/3089), [#2988](https://github.com/amruthpillai/reactive-resume/issues/2988).
- **Planned at:** `7a98f6662`, 2026-09-05. Priority P2; effort M per isolated defect; risk high for dependency metric/glyph changes, medium for template-local geometry.
- **Confidence:** High for current code and retained regression behavior; low/medium for historical residuals without original fixtures.
- **Readiness:** Diagnostic work ready; no speculative font replacement, global line-height correction, or glyph-cache reset approved.
- **Dependencies:** #3430, #3450, #3451 already merged. Plan 19 owns ordinary literal whitespace behavior; Plan 14 owns broader RTL layout. Coordinate rather than duplicate changes.

## Issue-specific scope and prior evidence

| Issue | What remains | What must not be redone or overclaimed |
| --- | --- | --- |
| #3249 | Ropa Sans historical vertical alignment, and any exact fixture still failing after current metric selection. | #3430 corrected Roboto/Roboto Condensed/IBM Plex Sans Condensed OS/2 selection and preserved Noto CJK/HK behavior. Ropa Sans hhea and typo metrics matched; it was unchanged by that fix. |
| #3159 | Generic garbled CV/characters. No sample text, template, font, or export supplied. | Script fallback code and closed #3157 do not prove this unknown report resolved. |
| #3147 | Keywords vertically clipping into primary titles, Chikorita sidebar, reportedly multiple templates. | #3253 fixed horizontal skill-name overflow. Eight reconstructed current PDFs with IBM Plex Serif, legacy/semantic modes, line heights 0.8/1/1.5, and a 25% sidebar did not reproduce vertical clipping. |
| #3093 | Exact Noto Serif SC screenshot spacing, still lacking original text/locale/template/PDF. | #3450 fixed character aliases sharing cached glyph metadata; #3451 preserved literal U+3000/NBSP. Ordinary-space controls already matched across locales. Neither proves the original screenshot's cause. |
| #3089 | Times-Roman-specific widened word/section spacing and clipped text in Rhyhorn. | Shared `overflow: hidden` was removed previously. Fresh Times-Roman/Tinos reconstruction rendered complete text with exact builder/PDF raster parity. Do not map Times-Roman to Tinos or promise Times New Roman without a product decision. |
| #2988 | Remaining Lapras old/new border shape and acronym spacing; exact paired PDFs were offered but not supplied. | Current reconstructed IBM Plex Serif PDFs visibly retain all nine fi/fl words, contact SVG icons, and section borders. Missing Phosphor font resources are expected because icons are now SVG. Extraction alone never proves ligature pixels. |

Fresh comments were read on the planning date. Prior reconstruction evidence is bounded: it does not match unknown settings or prove historical closure. Current retained tests were independently rerun during planning: 97 tests across six actual-PDF suites passed in 27.67 seconds (font metrics, glyph cache, Unicode spaces, paragraph indentation, ordered markers, imported tables). That is regression evidence, not a reproduction of all six reports.

## Current source and drift check

```sh
rtk proxy git diff --stat 7a98f6662..HEAD -- packages/pdf/src/hooks/use-register-fonts.ts packages/pdf/src/templates/shared packages/pdf/src/templates/lapras patches packages/pdf/src/font-metrics.integration.test.tsx packages/pdf/src/glyph-cache.integration.test.tsx packages/pdf/src/unicode-spaces.integration.test.tsx
```

Read changed files before proceeding. In an indexed checkout use CodeGraph first; do not create an index in a worktree. Runtime package imports go through export maps. Tests use Vitest and actual PDF.js text/operator extraction with task cleanup; use `font-metrics.integration.test.tsx` as the baseline-coordinate exemplar.

1. `patches/@react-pdf__textkit.patch` selects typo metrics only when the font flag requests them or the documented CJK exception applies:

   ```js
   const isCjkFont = /^(?:Noto (?:Sans|Serif) (?:SC|TC|HK|JP|KR)|Source Han (?:Sans|Serif)(?: (?:SC|TC|HK|JP|KR))?)$/.test(font?.familyName || '');
   const useTypoMetrics = os2?.fsSelection?.useTypoMetrics || isCjkFont;
   ```

   Do not restore unconditional typo metrics. `font-metrics.integration.test.tsx` pins Ropa Sans baseline offset 16.82pt at 20pt text, along with unrelated font and nine CJK family controls. Baseline offset is not an aesthetic approval of every template.
2. `packages/pdf/src/hooks/use-register-fonts.ts`, `registerFonts`, skips `Font.register` for standard PDF families. Its CJK line-break callback emits `"\u200C "` for an ordinary space and splits only words containing CJK letters. Arabic/Thai must not receive per-character breaking.
3. `patches/fontkit@2.0.4.patch` and `glyph-cache.integration.test.tsx` preserve per-character glyph metadata while retaining outline cache identity. Tests cover visible `.notdef`, ZWNJ/ZWJ, ligatures, marks, cache size, and sequential PDF exports. Do not fix a glyph alias by clearing global caches between documents.
4. `patches/react-pdf-html@2.1.5.patch` deliberately changes whitespace collapse to `/[\t\n\f\r ]+/g`, in both CJS and ESM. `templates/shared/rich-text-html.ts` likewise trims only HTML document whitespace. Literal Unicode spaces survive; broad entity decoding was not added.
5. `templates/shared/safe-text-style.ts` currently contains only:

   ```ts
   { minWidth: 0, maxWidth: '100%', flexShrink: 1 }
   ```

   `sections.tsx`, `SkillsSection`, wraps the name in `Bold` with `{ flex: 1 }` for the normal stacked layout. Keywords use `<Small semanticField="keywords">{item.keywords.join(', ')}</Small>`. Inspect composed/resolved styles and actual box coordinates for vertical overlap.
6. `templates/shared/primitives.tsx`, `Icon`, renders `PhosphorIcon` from `phosphor-icons-react-pdf/dynamic`. `templates/lapras/LaprasPage.tsx` sets section/header `borderWidth: 1` and `borderRadius: Math.min(picture.borderRadius, 30)`. A default picture radius of zero explains square control borders; it does not prove old template parity.

## Portable fixtures and measurement rules

Create controls by cloning `defaultResumeData`; hide pictures, select an explicit template, use one full-width page with summary, and set both body/heading family/weight/size explicitly. Always retain a copy of the original JSON before reducing it. New regression fixtures use fictitious text and preserve only necessary geometry/font settings.

- **#3249:** Gengar, body/head Ropa Sans 400, size 10/14, a profile containing label `github`, title `Baseline probe`, and a section heading. Compare line boxes and icon center. Use Roboto Condensed/Roboto Flex and IBM Plex Sans Condensed/IBM Plex Sans as already-fixed controls. The public [July 14 fixture](https://github.com/user-attachments/files/30023825/font-render-example.json) is Roboto Condensed, not an exact Ropa Sans sample; the [July 19 fixture](https://github.com/user-attachments/files/30163901/2026-07-19.civilian-harlequin-coral.json) contains margin workarounds. Do not silently strip those and call it original output.
- **#3159:** Diagnostic control only: `Latin café — 中文 العربية עברית فارسی`. Do not call this a reproduction. Required reporter string must be recorded as Unicode codepoints and UTF-8 bytes so encoding loss can be distinguished from missing glyphs.
- **#3147:** Chikorita; Skills name `Adaptive Communication`, keywords `Stakeholder communication, complex problem solving`; IBM Plex Serif 400/600, 10pt then 12pt, lineHeight 0.8/1/1.5, sidebarWidth 25/35, skills in sidebar. Capture both wrapped name and keyword bounding boxes. Preserve exact reporter settings when supplied.
- **#3093:** Noto Serif SC, Noto Sans SC, IBM Plex Serif; en-US and zh-CN. Compare plain versus `<p>` rich text for `中 文 字`, `中\u3000文\u3000字`, literal NBSP, and leading/trailing U+3000. At 10pt the retained ideographic control spans 50pt; ordinary-space case approximately 35.12pt with its existing font fixture. Reuse the exact fixtures in the current Unicode/cache tests rather than assuming those widths apply to every family.
- **#3089:** Rhyhorn skills `Public Key Infrastructure (PKI)` and `Cyber Security (u.a. Strategy, Architecture)`, Times-Roman then Tinos; 1/4 columns; body sizes10/12; no authored overrides then original overrides. The cross-font comparison diagnoses differences; Tinos is not guaranteed metric-identical to Times-Roman.
- **#2988:** Lapras, IBM Plex Serif, text `Pacific fit Defined flash Influenced Conflict flux field confidence ABC,`; populate email/phone/location/website and summary/skills/experience. Test picture borderRadius0 and8 because Lapras couples box radius to it. Capture each ligature at high resolution and section corner geometry; the old screenshot alone cannot define all spacing.

PDF measurements must include `{text, fontName, x, y, width, page}` plus raster crops and relevant drawing operators. Render at the same scale for before/after comparison. Exact text can coexist with a visually missing glyph; use raster inspection for #2988 and clipping reports. Do not compare screenshot CSS pixels directly with PDF points.

## Ordered issue-specific work

### 1. Freeze current known-good behaviors

```sh
rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/font-metrics.integration.test.tsx src/glyph-cache.integration.test.tsx src/unicode-spaces.integration.test.tsx
```

Expected: all tests pass. Network/font-download failure is an environment failure, not a new layout defect. Record font source/version or hash for comparisons. Stop if current patch behavior differs from this plan.

### 2. Select the first failing boundary per report

**#3249:** Obtain an exact Ropa Sans fixture and old/new PDF. Read font hhea/OS2 ascent/descent and `fsSelection.useTypoMetrics`; compare glyph baseline to text frame and icon frame. If metrics match, stop proposing metric changes and inspect template line-height/alignItems/author margins. Only change the proven template or metric branch. Add an actual-PDF baseline assertion and unchanged control fonts before implementation.

**#3159:** Compare entered text → saved HTML/JSON → PDF extracted codepoints → raster. Encoding differs before rendering: route to the owning importer/editor/API. Codepoints intact but font lacks glyph: verify actual selected fallback source and face before changing `resumeContentScripts`/fallback ordering. Glyph exists but shaping wrong: isolate script shaping with a minimal actual font fixture. Stop without original text; an invented multilingual control cannot select a fix.

**#3147:** Compare keyword top/bottom and primary text frame under original styles. If raster overlap is absent, retain bounded negative result. If text frame height is too small, isolate lineHeight/overflow/font metrics; if block positions overlap, isolate rowGap/margin/flex composition. Do not change skill-name width or add global minHeight for a vertical defect. Add `keyword-overlap.integration.test.tsx` asserting non-overlapping ink/box bounds for the exact failure and a multiline control.

**#3093:** Run the original sequence in fresh and warm processes. A PDF created after a Unicode-only/preformatted document must retain invisible-character suppression and ordinary-space width; preserve cache-size invariants. Distinguish literal U+3000/NBSP from named/numeric entities before changing normalization. Any entity support expansion needs a separate explicit contract and tests. Never reintroduce broad `\s` collapse or per-document cache clearing.

**#3089:** Measure Times-Roman glyph advances and word/section gaps at equal widths, before and after custom styles. If only preview differs, render the exact downloaded PDF independently using `preview-raster-direction.spec.ts`'s method; do not change standard-font metrics. If PDF itself clips, isolate frame width/style with an actual-PDF red assertion. Keep Times-Roman identity and aliases unchanged unless the maintainer approves a catalogue policy.

**#2988:** Use paired old/new PDFs and matching JSON if supplied. Compare SVG icon ink rather than embedded font names; compare fi/fl glyph pixels rather than extracted strings; compare border corner paths separately from text spacing. If only author radius settings differ, record that instead of changing Lapras. If subsetting fails, minimize font/glyph sequence and preserve existing ligature/cache tests before any dependency patch. A border fix belongs in Lapras when only that template is wrong.

**Gate for each issue:** a retained failing test plus source fixture, or an explicit missing-fixture/bounded-negative result. Do not start a production fix in the latter branch.

### 3. Implement only proven owner changes

Allowed candidates after gate: the shared files above, the specific template page when isolated, existing integration suites, and new `keyword-overlap.integration.test.tsx` / `font-residuals.integration.test.tsx`. Add script/font catalogue changes only when coverage proves a missing family/face and the maintainer approves the extra package scope. Preserve package exports; never import another package's `src` tree.

For dependency patches, change installed-version CJS/ESM paths consistently and regenerate the pnpm patch hash through the repository workflow. Frozen install must apply the patch. Require red/green rendering plus retained cache identity/size checks; do not manually edit node_modules as the delivered fix.

**Gate:** exact red regression passes, and no unrelated family baseline, glyph text, or page count changes without explanation.

### 4. Production and review acceptance

Import sanitized fixture into a disposable account, capture builder preview, browser download and server/public PDF from the same saved data. Run first export and repeat after a different-script document. Record engine version and font network status; no user data or secrets in artifacts. Use a new `tests/e2e/specs/font-residuals.spec.ts` modeled on existing fixture cleanup and PDF raster reference test.

```sh
rtk proxy pnpm --filter @reactive-resume/pdf test
rtk proxy pnpm --filter @reactive-resume/pdf typecheck
rtk proxy pnpm --filter web typecheck
rtk proxy pnpm exec turbo boundaries
rtk proxy pnpm build
rtk proxy dotenvx run -f .env.local -- pnpm exec playwright test tests/e2e/specs/font-residuals.spec.ts --reporter=list
```

Expected: all pass; each implemented issue's original symptom absent in both actual PDF and preview. Dedicated database/unique port required. `pnpm check` is write-capable; inspect its diff. Independent review before authorized publication; never merge.

## Per-issue done criteria and escape hatches

- [ ] #3249: Ropa Sans exact fixture either fixed with measured baseline evidence or explicitly still unverified; Roboto/CJK regressions remain green.
- [ ] #3159: exact character sequence traced across all four boundaries, or missing sample recorded without invented diagnosis.
- [ ] #3147: vertical title/keyword overlap measured independently from horizontal skill-name wrapping.
- [ ] #3093: original screenshot equivalence assessed separately from merged cache/Unicode fixes; sequential exports and literal-space controls pass.
- [ ] #3089: original Times-Roman spacing/clipping assessed without font replacement; requested TNR availability remains a separate product decision.
- [ ] #2988: all four subclaims (icons, ligatures, borders, spacing) have separate evidence/disposition; old/new parity never inferred from one smoke PDF.

Stop if original fixtures are unavailable, source drift invalidates excerpts, a proposed fix changes many unrelated fonts, or validation fails twice without a new causal hypothesis. Recheck this plan after renderer/font upgrades; glyph metrics and template spacing are coupled, so a broad “alignment fix” needs stronger evidence than one screenshot.
