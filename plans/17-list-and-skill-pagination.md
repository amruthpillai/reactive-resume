# Plan 17: Verify remaining list-marker and skill-decoration clipping separately

> Preserve the distinction between missing pixels, horizontal overlap, and author-controlled pagination. Two issues share measurement utilities, not an established fix. The maintainer owns index updates and closure decisions.

## Status and residual scope

- **Issues:** [#2751](https://github.com/amruthpillai/reactive-resume/issues/2751), [#3040](https://github.com/amruthpillai/reactive-resume/issues/3040).
- **Planned at:** `7a98f6662`, 2026-09-05. Priority P2; effort M; risk high for page-fragmentation changes, medium for local marker sizing. Confidence medium for current controls, low for historical equivalence.
- **Readiness:** Diagnostics ready. No new pagination policy authorized here.
- **Dependencies:** Merged #3449 ordered-marker gutters and #3434 level gaps must remain. Plan 23/#3350 owns optional item keep-together policy; do not preempt it with `wrap={false}` on skills.

**#2751:** Cloud Rhyhorn5.0.10 screenshot shows incomplete leading digit in exported numbered items compared with preview. Original missing digit was not reproduced. A different current defect was measured: marker/body overlap of2.395pt for10–99 and7.869pt for100–102 at10pt Helvetica. #3449 fixed that overlap and common gutter, including letter-spacing. It does not prove the original missing-digit report equivalent. Other older list fixes concern marker/page companions rather than digit clipping.

**#3040:** Thread explicitly separates (1) vertical clipping of skill decorations, (2) horizontal long-name clipping, and (3) text/level splitting across pages. Reporter confirmed (2) fixed in5.2.4/#3253. Maintainer treated (3) as author spacing control and reporter accepted. Latest gap request is addressed by #3434 allowing `gap`, `row-gap`, `column-gap` on level. Remaining vertical clipping has no current positive reproduction.

The supplied Onyx/IBM Plex Serif fixture produced two pages,164+2 text items; all66item icons and330circles were present (65 circle rows onpage1, last row onpage2).397red connected components matched1separator+66icons+330circles. Those counts were a prior exact-fixture observation, not an assertion that its page split is a renderer bug. Margin fix #3422 did not change those components. Current ordered-marker suite passed in the planning97-test rendering baseline.

## Current source and drift gate

```sh
rtk proxy git diff --stat 7a98f6662..HEAD -- packages/pdf/src/templates/shared/rich-text.tsx packages/pdf/src/templates/shared/sections.tsx packages/pdf/src/templates/shared/level-display.tsx packages/pdf/src/templates/shared/ordered-marker.test.tsx packages/pdf/src/templates/shared/list-pagination.test.tsx packages/resume/src/stylesheet
```

If a path moved, locate its current owner before using the plan. Do not infer source semantics from old line numbers.

- `rich-text.tsx`, custom `li` renderer, sets marker from `element.indexOfType + 1`, finds list length, and reserves common size unless authored width/flexBasis overrides it:

  ```ts
  orderedMarkerStyle = {
    width: 'auto',
    minWidth: markerDigits * markerFontSize + (markerDigits + 1) * markerLetterSpacing,
    flexShrink: 0,
  };
  ```

  Preserve explicit author sizing. It uses marker/content semantic nodes and page-companion behavior; unrelated wrapping changes can strand markers.
- `ordered-marker.test.tsx`, `renderList`/`assertGutters`, generates9/12/102items in Helvetica/Courier/Noto Serif SC, LTR/RTL, columns/sidebar/nesting. It asserts each marker occurs on its body's page, gutter>0.5pt, and common body edge spread<0.01pt. Reuse these actual-PDF assertions.
- `list-pagination.test.tsx` covers marker first-line presence, long list continuation, orphan counts, semantic filtering/reordering, nested lists, and oversized presence hints. Keep those guards; a blanket unbreakable list item regresses long content.
- `sections.tsx`, `SkillsSection`, gives stacked skill `Bold` name `{flex:1}`; `LevelDisplay` is separate from name/proficiency/keywords. Current separation is not proof of accidental data loss.
- `level-display.tsx` renders five decorations from `LEVEL_ITEM_KEYS`; level0/hidden design suppresses intentionally. Its container composes `{flexDirection:'row', alignItems:'center', marginTop:2, columnGap:gap}` before template, legacy, and semantic styles. Decorations use resolved flow props, explicit size, and border width0.75. Inspect actual resolved style before overriding margins.

## Portable controls and required original fixtures

For #2751 reuse `ordered-marker.test.tsx`'s fixture shape: clone defaultResumeData; one Rhyhorn projects section; description `<ol>` containing `<li><strong>ITEM0_001</strong></li>` through102; Helvetica10pt body; semantic `@version 1;`. Different weight separates marker/body runs. Compare items9/10/11/99/100/102, long wrapped bodies, and a forced physical page boundary. Repeat legacy mode and original reported font/settings when available. Original screenshot is not enough to establish marker numbering/start attributes or widths.

For #3040 public source is [2026-05-11 overflow-test.json](https://github.com/user-attachments/files/27609476/2026-05-11.overflow-test.json). Keep its geometry/style metadata when sanitizing; do not commit private details. If unavailable, create a controlled fixture from defaultResumeData with66skills, five active circles per skill, red primary color, Onyx/IBM Plex Serif, and enough content to cross a page. This synthetic case is not guaranteed to reproduce the original page counts. Add Rhyhorn and Scizor only as explicit controls.

Use names `Geschäftskontinuität (BCM)`, `Public Key Infrastructure (PKI)`, and `Cyber Security (u.a. Strategy, Architecture)` for the already-fixed horizontal control. Compare1/4 columns; decoration sizes from selected body size; level0/5; circle/icon/progress-bar; gap0/4pt. Preserve author `keepTogether` and custom margins instead of silently clearing them.

## Ordered work and implementation forks

### 1. Verify the existing fix floor

```sh
rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/templates/shared/ordered-marker.test.tsx src/templates/shared/list-pagination.test.tsx
```

Expected all pass. A failure here is drift or a new regression to isolate before extending this plan. Do not rerun a generic smoke suite and call it digit/border evidence.

### 2. Inspect missing digits and marker geometry (#2751)

Render actual PDF; extract complete marker strings and coordinates, then inspect raster crops at the marker left edge. A complete extracted `10.` can still be visually clipped, so both layers are required. Compare builder canvas with independent rendering of downloaded bytes at matched scale using existing `preview-raster-direction.spec.ts` pattern.

If marker text exists but raster clips only in preview, route to canvas geometry. If clipped in PDF, isolate authored width, clipping ancestor, marker font, and layout frame. If markers are absent from text itself, inspect source list structure/semantic visibility. Do not increase common gutter again when the original digit remains unproved.

**Gate:** exact left-digit raster loss with source fixture and positive existing-gutter controls, or a bounded negative result. Only the first permits a new fix.

### 3. Count full decorations before changing skill pagination (#3040)

For each page, measure all five decoration bounds per visible skill, count circle/icon paths or color-connected components, and correlate with text/level positions. A row moved to the next page is different from a row clipped halfway. Keep a last-item label to identify the final row; do not infer from total text count alone.

If all rows are intact but split from names, record current author-controlled behavior and defer to Plan23. If half a row is physically missing, minimize body font/line height, style size, gap and page edge, then add `skill-decoration-clipping.integration.test.tsx` asserting five complete shapes within bounds. If only gap rejected, verify current compiler support and #3434 tests instead of a duplicate fix.

**Gate:** a precise missing/partial decoration assertion fails before implementation; exact source and raster are retained. No default `wrap={false}` change is allowed by this plan.

### 4. Implement the proven local correction

Initial additions: focused PDF regressions and `tests/e2e/specs/list-skill-rendering.spec.ts`. Runtime edits only to `rich-text.tsx` for marker geometry or `level-display.tsx`/specific template style for decoration geometry, after the relevant red gate. Package-level fragmentation changes require a revised reviewed plan with long-content/oversized-item termination proof. Preserve explicit semantic CSS, hidden decorations, both directions, and all existing list flow tests.

**Gate:** exact red case passes; other markers retain uniform edge/gutter; long lists still continue; all active skill shapes remain within page bounds without unintended extra pages.

## Production checks and done criteria

```sh
rtk proxy pnpm --filter @reactive-resume/pdf test
rtk proxy pnpm --filter @reactive-resume/pdf typecheck
rtk proxy pnpm exec turbo boundaries
rtk proxy pnpm build
rtk proxy dotenvx run -f .env.local -- pnpm exec playwright test tests/e2e/specs/list-skill-rendering.spec.ts --reporter=list
```

New spec is created in Step4. Expected exit0. Use disposable account, unique port and dedicated database; compare preview/browser/server PDF from one saved revision. Run write-capable `pnpm check` with diff inspection. Independent review before authorized publication; never merge.

- [ ] #2751 original missing-digit disposition separate from merged overlap fix; complete marker text and pixels checked.
- [ ] #3040 vertical clipping, horizontal name wrapping, page splitting, and level gap each have a separate result.
- [ ] No unapproved item keep-together default or blanket renderer overflow change.
- [ ] Exact fixtures are portable/sanitized; missing original settings remain explicit.

Stop if only page placement preference remains, if original source cannot reproduce missing pixels, or if any fix requires modifying layout dependency patches without a new bounded design. The maintainer decides whether author-controlled spacing should change.
