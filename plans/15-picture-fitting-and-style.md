# Plan 15: Diagnose picture delivery, square-preview geometry, and non-square fitting separately

> These four reports share picture surfaces but do not prove one cause. #2782 uses the explicitly labeled agent judgment below: optional Cover/Contain with Cover retained as default. Preserve the other symptoms in bundled reports. Index and issue status updates belong to the maintainer.

## Status and issue coverage

- **Issues:** [#3168](https://github.com/amruthpillai/reactive-resume/issues/3168), [#3088](https://github.com/amruthpillai/reactive-resume/issues/3088), [#2794](https://github.com/amruthpillai/reactive-resume/issues/2794), [#2782](https://github.com/amruthpillai/reactive-resume/issues/2782).
- **Planned at:** `7a98f6662`, 2026-09-05. Priority P2; effort M–L; risk medium (rendering) / high (storage and destructive cropping). Confidence medium for existing behavior, low for historical root causes.
- **Readiness:** Diagnostics ready; #2782 implementation direction ready under delegated routine judgment. No additional product answer required for the bounded fit selector. Historical reporter equivalence still requires the missing source fixture.
- **Dependencies:** Plan 06 owns upload/storage delivery if network evidence points there. Plan 13 owns font/spacing regressions. Do not duplicate either fix merely because the symptom appears near a picture.

| Issue | Symptoms that must each be retained | Current evidence / limitation |
| --- | --- | --- |
| #3168 | Missing picture across Rhyhorn/Bronzor plus unclear headline glitch; later public/private reload/cache inconsistency. | Thread includes sanitized JSON and 800×800 JPEG. A current Node export had an image operator; that does not test intermittent browser/public cache. Reporter observed image in sidebar but absent from PDF preview, including cross-window updates. Load-balancer/cache explanations are hypotheses. |
| #3088 | Gengar photo missing, bold text regular, language spacing, email underline request. | True bold-face resolution from #3335 is present; page UI has hideLinkUnderline. Those facts do not prove photo or language layout resolved. No exact JSON. |
| #2794 | 600×600 square PNG appears offset/cropped only in live preview, more visible with shadow; downloaded PDF correct. | Fresh controlled production matrix: 72 same-PDF RGBA comparisons matched exactly, 144 bitmap/screenshot edge checks passed within one CSS pixel. Exact original source PNG is absent; attachment is a cropped screenshot. |
| #2782 | 2592×1944 close-up phone picture cropped in Gengar; author wants zoom out/uncrop and cannot make it square externally. | Current UI crops before upload and PDF uses cover fitting. Crop UI can remove pixels; later contain fitting cannot recover already discarded source. Agent judgment: offer opt-in Contain and uncropped upload while preserving default Cover behavior; no original-asset history. |

## Current state and drift

```sh
rtk proxy git diff --stat 7a98f6662..HEAD -- 'apps/web/src/routes/builder/$resumeId/-sidebar/left/sections/picture.tsx' packages/schema/src/resume/data.ts packages/schema/src/resume/default.ts packages/pdf/src/templates/shared/base-template-styles.ts packages/pdf/src/templates/shared/primitives.tsx packages/pdf/src/templates/shared/sections.tsx packages/pdf/src/hooks/use-register-fonts.ts tests/e2e/specs/picture-upload.spec.ts
```

Use named props types, existing form/draft mutation hooks, package exports, and disposable worktrees. Stop if crop/upload or picture schema changed.

- `picture.tsx`, `uploadPictureFile`, `getCroppedImageBlob`, and crop state: selecting a file opens `Crop picture`; `Save & Upload` calls `getCroppedImageBlob(...)` then uploads a new `File`. The original selection exists in transient `cropState.file`. `cropAspect = Number(form.state.values.aspectRatio) || 1`. Do not assume original bytes are retained after successful cropped upload.
- `packages/schema/src/resume/data.ts:34`, `pictureSchema`, owns picture URL, size (32–512pt), rotation, aspect ratio (0.5–2.5), border and shadow. It currently has no fit field. `packages/schema/src/resume/default.ts` supplies defaults. Add the fit contract here rather than creating a parallel component-only preference.
- `packages/pdf/src/templates/shared/base-template-styles.ts:135`:

  ```ts
  picture: {
    width: picture.size,
    height: picture.size,
    objectFit: 'cover',
    aspectRatio: picture.aspectRatio,
    // border, shadow, radius, rotation follow
  }
  ```

- `primitives.tsx`, `SemanticHeaderPicture`, composes semantic picture styles. With shadow/border, the outer frame owns border/padding, inner image fills content box with border/padding reset. Without either it returns Image directly. Test both branches; do not subtract insets twice.
- `templates/shared/picture.ts`, `hasTemplatePicture`, requires `!picture.hidden && picture.url.trim() !== ''`.
- `sections.tsx`, `LanguagesSection`, uses `SectionItems columns={languages.columns}`, a flex-growing text group for multiple columns, and separate `LevelDisplay`. Language spacing is not a picture style.
- `hooks/use-register-fonts.ts` resolves the real bold face and registers it; `#3335` is not proof every legacy weight selection survives. `use-resume-export.ts` uses browser generation for owner downloads and public PDF resolution separately.

## Portable square/non-square calibration fixture

Generate this in a Playwright page, then upload the resulting bytes through the actual crop dialog. It contains no private image:

```ts
const png = await page.evaluate(() => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Missing canvas');
  ctx.fillStyle = '#ffff00'; ctx.fillRect(0, 0, 600, 600);
  ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 60, 600);
  ctx.fillStyle = '#00ff00'; ctx.fillRect(540, 0, 60, 600);
  ctx.fillStyle = '#0000ff'; ctx.fillRect(60, 0, 480, 60); ctx.fillRect(60, 540, 480, 60);
  ctx.fillStyle = '#000000'; ctx.fillRect(294, 60, 12, 480); ctx.fillRect(60, 294, 480, 12);
  return canvas.toDataURL('image/png');
});
```

For non-square diagnostic control, create a 2592×1944 canvas with the same four color strips proportional to dimensions and a central cross. Keep all four corner markers visible in the source. Record whether bytes uploaded after crop still contain them. This is not the reporter's close-up portrait.

Use Onyx, picture size120pt, ratio1, rotation0, en-US UI/resume. For square parity reproduce six combinations `(shadow,border,radius,padding)` in points: `(0,0,0,0)`, `(8,0,0,0)`, `(8,8,0,0)`, `(8,8,24,0)`, `(8,8,24,5)`, then the last with original PNG data URI bypassing upload. Opaque uploaded PNG may become JPEG; inspect MIME and dimensions rather than assuming PNG decoder coverage.

Cross DPR1/1.25/2/3 with settled builder zoom75/100/115%. Browser full-page zoom was not varied in the prior matrix; add it only when the original environment requires it. Previous controlled result is bounded to Chromium/Onyx/120pt, not all templates/images.

## Ordered diagnostic and implementation branches

### 1. Preserve exact source and first failing layer (#3168)

Read the existing [supplied JSON](https://github.com/user-attachments/files/30536770/3168.json) and attachment metadata if available. Never commit user photo or contact details. Construct a sanitized equivalent retaining URL representation, image encoding/dimensions, picture style, font, and template; host synthetic bytes through the dedicated test upload path.

Compare fresh authenticated session, warm session, independent authenticated context, anonymous public view, and fresh private context. At each capture saved picture URL/revision, image HTTP status/content type/content hash, sidebar decoded dimensions, PDF image operators, and preview raster. Test normal reload and cache-disabled reload separately. An image operator may be a shadow; verify bitmap content/size too.

If fetch fails, hand exact delivery evidence to Plan 06. If stored URL differs across windows, investigate persistence/sync owner. If bytes decode but PDF omits them, isolate renderer cache/source key and format. Do not add cache-busting timestamps or disable every cache before demonstrating stale identity. Headline glitch needs its own minimal text/style fixture; record missing fixture if not supplied.

**Gate:** first failing boundary is reproducible with identical source image and saved revision. One successful Node export cannot pass this gate.

### 2. Split Gengar's bundled symptoms (#3088)

Build separate controlled records for picture, `<strong>BoldProbe</strong> NormalProbe`, language names/fluencies, and an email containing `_`. Verify the actual selected bold font resource/glyph weight and current underline toggle in PDF. For languages compare1/3 columns, levels0/5, one/multiline fluency, and original gap/styles when available.

If photo fails, use Step 1 rather than a Gengar-only workaround. If spacing fails, measure item/level boundaries and patch only `LanguagesSection` or template style proved causal. Preserve all four issue dispositions independently.

**Gate:** exact affected symptom has a visual regression. Existing bold registration or available toggle alone does not close the bundled issue.

### 3. Recheck square preview with identical downloaded PDF bytes (#2794)

Use `tests/e2e/specs/preview-raster-direction.spec.ts`'s routed local PDF.js reference method, but supply actual downloaded PDF bytes. Create reference canvas with the same bitmap dimensions/inherited styles, direction LTR, annotations disabled, white background, and matched scale/transform. Compare all RGBA pixels after preview generation and zoom animation settle. Derive scale for new settings; do not copy a hard-coded factor outside its controlled case.

Measure red/green edge widths and black-cross/frame center in both canvas bitmap and displayed screenshot. Prior acceptance: zero same-engine pixel differences; marker width difference ≤1 CSS px; frame center offset ≤1 CSS px. Independent Poppler antialiasing may differ; compare geometry rather than exact pixels.

If parity holds with original image, no viewer fix is warranted. If only screenshot differs, inspect CSS transform/clip/layout; if preview bitmap differs from same-byte reference, inspect canvas scale/render timing; if both PDFs differ, route to generated picture geometry.

**Gate:** exact source PNG plus source JSON/browser context is needed to call historical #2794 fixed. Controlled matrix alone supports a bounded negative result.

### 4. Add opt-in uncropped fitting (#2782)

**Agent judgment, not an explicit user-selected visual preference:** add Cover/Contain choices and retain Cover for existing and new resumes. This satisfies an optional uncropped use case without changing current layouts. Contain preserves the entire uploaded bitmap inside the existing picture frame with centered placement and unused transparent space; frame size, aspect ratio, border, shadow and rotation remain independent. Explicit Semantic CSS `object-fit` still wins through normal style precedence.

**Bounded source policy:** in Contain mode upload the selected full image through the existing storage endpoint, bypassing destructive crop. Store only that one selected asset; do not add original/cropped histories, extra storage records, or recovery promises. Existing cropped images stay cropped until the user reuploads the original. Keep existing file size/type validation; if full image exceeds accepted limits, show the existing actionable error instead of silently cropping away edges. Pixel-preserving re-encoding is permitted only if all source edges survive and existing upload limits remain enforced.

1. **Add persisted compatibility contract.** Extend `pictureSchema` with `fit: z.enum(["cover", "contain"]).catch("cover")`, following nearby schema fallback conventions, and add `fit: "cover"` to default data. Add tests in `packages/schema/src/resume/data.test.ts` and `default.test.ts`: absent/invalid legacy value becomes Cover, Contain survives parse/write/JSON round-trip. Update typed fixture/default constructors and v4 importer output only as required to preserve Cover; no DB migration or automatic rewrite of stored resumes. Run `rtk proxy pnpm --filter @reactive-resume/schema test` and schema typecheck; expected all pass.
2. **Expose the existing form field.** In `picture.tsx`, use the current settings form and auto-save path for a named Fit control; labels Cover and Contain explain cropping versus showing the whole image. Keep the current crop dialog for Cover. For Contain, `onUploadPicture` sends the selected file to `uploadPictureFile` without constructing a cropped canvas. Test mode change, upload failure, cancel, locked state, save/reload and undo where the builder supports it. Change the sidebar image's hard-coded `object-cover` class to reflect the selected fit so it does not contradict the PDF. Do not add another mutation endpoint.
3. **Use shared renderer style.** Set shared `picture.objectFit` to `picture.fit`; preserve subsequent semantic overrides. `DittoPage.tsx` spreads `base.picture` before absolute placement, so test that inheritance rather than adding a redundant fit branch. Inspect all other template image consumers with `rtk proxy rg -n 'base.picture|SemanticHeaderPicture|objectFit' packages/pdf/src/templates`; any image path not using the shared fit requires a focused propagation change. Stop if an affected template's geometry deliberately excludes the picture and needs a different product feature.
4. **Write actual geometry regressions.** Extend `picture-border.test.tsx` or add `picture-fit.integration.test.tsx`: controlled square, 2592×1944 landscape, and 1944×2592 portrait, each Cover/Contain, border/shadow on/off. In Contain, all four edge markers survive and image center differs from frame center by at most one raster pixel after rounding. The image bounding box follows `scale = min(frameContentWidth / sourceWidth, frameContentHeight / sourceHeight)`; compare content-box dimensions, not outer border size. Cover controls retain pre-change crop geometry. Test explicit semantic `object-fit: cover` overriding selected Contain.
5. **Verify real upload and export.** Run production with the full-image fixture through the new Contain upload route, save/reload, then export JSON/browser PDF/server PDF. Assert Contain persists, source-edge colors remain in stored decoded image and both PDFs, and actual builder/reference rasters agree. Switching Contain→Cover→Contain without reupload must not modify the stored file. Uploading while Cover is selected remains intentionally destructive cropping; later switching cannot recover discarded pixels, and the UI must explain reuploading the original when needed.

**Gate:** red/green full-image edge regression, compatible default parsing, persistence, matched preview/download fit, and unchanged Cover controls. This is a new opt-in remedy; do not claim exact historical #2782 reproduction without the original portrait/settings.

## Test ownership, commands, and completion

Add focused `tests/e2e/specs/picture-rendering.spec.ts` using existing authenticated fixture cleanup. PDF geometry tests belong beside `picture-border.test.tsx`; network delivery belongs to its existing owner. #2782 scope includes the schema/default/form/shared renderer and compatibility tests explicitly listed in Step4, plus Lingui catalogs for labels. No new API/storage schema. New files named here are proposed additions, not existing test claims.

```sh
rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/templates/shared/picture-border.test.tsx src/templates/shared/picture-shadow.test.ts src/templates/shared/picture.test.ts
rtk proxy pnpm --filter web typecheck
rtk proxy pnpm --filter @reactive-resume/schema typecheck
rtk proxy pnpm --filter @reactive-resume/pdf typecheck
rtk proxy pnpm exec turbo boundaries
rtk proxy pnpm build
rtk proxy dotenvx run -f .env.local -- pnpm exec playwright test tests/e2e/specs/picture-upload.spec.ts tests/e2e/specs/picture-rendering.spec.ts --reporter=list
```

Expected all pass. Dedicated E2E database and unique port mandatory; no user data. Run write-capable `pnpm check` only with diff inspection. No PR publication without executor authorization; never merge.

- [ ] #3168: delivery/cache and headline subclaims independently reproduced or missing-fixture limited.
- [ ] #3088: photo, bold, languages, underline each have a result; no bundled closure from one partial fix.
- [ ] #2794: actual same-byte preview/export parity plus edge geometry, with exact-image limitation explicit.
- [ ] #2782: labeled Cover/Contain judgment implemented with Cover default, uncropped Contain upload, full-edge PDF evidence, schema compatibility and no extra asset history.

Stop if original asset is unavailable, authenticated/public source revisions differ, or a fix requires unreviewed storage/schema changes. Do not conflate square preview offsets with deliberate cropping of non-square input.
