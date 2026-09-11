# Plan 19: Define literal whitespace semantics before changing editor and export normalization

> Whole-paragraph indentation is already implemented. This plan covers the remaining leading-space/tab request. The user approved the recommended intentional ordinary-text preservation direction on 2026-09-05. Execute the diagnostic and regression gates before changing runtime code.

## Status and intent

- **Issue:** [#3397](https://github.com/amruthpillai/reactive-resume/issues/3397).
- **Planned at:** `7a98f6662`, 2026-09-05. Priority P2; effort M–L; risk high for global HTML whitespace changes.
- **Readiness:** Known behavioral mismatch, high confidence; implementation direction approved. Preserve intentional whitespace in ordinary paragraphs/headings using the scoped persisted contract below. Tab width and existing line-break behavior use the labeled routine judgments below.
- **Dependencies:** Existing paragraph indentation and merged #3451 literal Unicode spaces must remain. Coordinate RichInput changes with Plan16 tables. No need to reimplement paragraph indentation.
- **Reported request:** Existing Increase/Decrease indent controls should work outside lists, AND literal leading spaces/tabs should be respected. The first part was approved and merged; the second remains open.

Whole paragraphs/headings now carry integer levels0–8, each24CSSpx/18pt/360twips. Narrow PDF inset is capped to half available width to avoid deleting text. Existing16-case Chikorita narrow-width controls and22-case indentation regressions passed previously. Current paragraph-PDF tests also passed in the planning97-test baseline. Overlong heading words can still clip at an equivalent narrow unindented width; do not treat that separate renderer limitation as permission to add forced hyphenation.

## Current source and exact characterization

```sh
rtk proxy git diff --stat 7a98f6662..HEAD -- apps/web/src/components/input/rich-input.tsx apps/web/src/components/input/paragraph-indent.ts apps/web/src/components/input/rich-input.indent.test.tsx packages/pdf/src/templates/shared/rich-text-html.ts patches/react-pdf-html@2.1.5.patch packages/pdf/src/paragraph-indent.integration.test.tsx packages/docx/src/html-to-docx.ts packages/docx/src/paragraph-indent.test.ts
```

Reconcile source drift before implementation. Browser editor belongs to web; PDF adapter belongs to packages/pdf; DOCX belongs to packages/docx. Do not create a global utility with DOM/renderer dependencies or import another package's source tree.

- `paragraph-indent.ts`, `ParagraphIndent`, persists `data-indent` and `margin-inline-start`; list descendants use existing sink/lift behavior, not paragraph offsets. Keep undoable normalization and capability checks free of mutation.
- `rich-input.tsx` uses Tiptap content parsing and emits `editor.getHTML()` on updates; `setContent(value,{emitUpdate:false})` handles prop/reload data. `StarterKit` explicitly disables codeBlock. Therefore importing PRE into PDF is not evidence of an available editor literal-block feature.
- `rich-input.indent.test.tsx` currently characterizes:

  ```ts
  // Initial import loses leading HTML document whitespace.
  input('<p>   First</p><p>\tSecond</p>');
  expect(editor.getHTML()).toBe('<p>First</p><p>Second</p>');
  // Typed whitespace can be emitted, then is lost on re-import.
  editor.view.dispatch(editor.state.tr.insertText('   \t', 1));
  // saved == '<p>   \tFirst</p>'
  editor.commands.setContent(saved, { emitUpdate: false });
  // editor HTML == '<p>First</p>'
  ```

- `packages/pdf/src/paragraph-indent.integration.test.tsx` asserts `<p>   First</p><p>\tSecond</p>` has the same rendered geometry as no leading whitespace. Preserve that legacy unmarked-HTML characterization and add distinct desired assertions for the approved marked preservation contract.
- `patches/react-pdf-html@2.1.5.patch` collapses `[\t\n\f\r ]+` in both module builds; U+3000/NBSP remain literal. `rich-text-html.ts` also trims only this HTML whitespace set. Removing collapse globally risks line wrapping and imported pretty-printed HTML across every resume.
- `packages/docx/src/html-to-docx.ts` creates TextRuns from inline text. `paragraph-indent.test.ts` confirms spaces and literal tab remain in serialized text with no `w:ind`; it does not prove a particular tab-stop visual width in Word/LibreOffice.

## Approved preservation contract

**Approved direction (2026-09-05):** the user approved the recommended plans, including intentional whitespace preservation in ordinary paragraphs/headings. Mark the preservation contract in emitted HTML so legacy imported prose retains its previous normalization unless deliberately edited or explicitly converted. No separate literal-block feature is required. Approval does not authorize applying `preserveWhitespace: 'full'` globally.

**Implementation judgment:** add a paragraph/heading attribute serialized as `data-resume-whitespace="preserve"`. Newly authored blocks and blocks receiving user text-input/paste transactions use this mode; mounting, prop updates and importing unmarked legacy HTML must not mark or rewrite them. Parsing marked blocks preserves their literal text, including leading/trailing spaces and tabs. The marker must survive save/reload, paragraph↔heading conversion and supported copy/paste. Keep the policy scoped to ordinary paragraph/heading text; lists retain their indentation ownership and existing semantic structure. Do not silently discard the marker during list conversion if doing so would lose authored content—retain text preservation independently from paragraph indentation.

**Routine agent judgments, not explicit user-selected preferences:** one literal tab renders as four ordinary-space advances in the current run's font, independent of current x position (not alignment to tab stops). Keep the tab codepoint in persisted content if the chosen node/attribute contract supports it; adapters may expand it for rendering. Keep Enter as a new paragraph and Shift+Enter as a line break. Use existing paste block/line-break rules, adding only intentional-space preservation; do not redesign paste or introduce global tab-key interception outside the chosen editing context. Preserve soft wrapping and full content at narrow widths; spaces used to display a tab must not become four unbreakable NBSPs. These decisions make the plan executable without separate questions about tab width or keyboard conventions.

Proceed with characterization and red/green implementation under this approved scope. No global parser switch, new code-block UI, or blanket NBSP substitution is selected. Global picture-fit decisions are unrelated.

## Portable test matrix

Use these literal inputs in new/extended DOM, PDF and DOCX tests:

```ts
const fixtures = [
  '<p>   First</p>',
  '<p>\tSecond</p>',
  '<p>A  B\tC</p>',
  '<p>First<br>   Second</p>',
  '<p><strong>   Bold</strong> tail</p>',
  '<p>\u3000中\u3000文</p>',
  '<p>A\u00a0B</p>',
  '<pre>   First\n\tSecond</pre>',
  '<blockquote><p>   Quoted</p></blockquote>',
  '<ul><li><p>   Listed</p></li></ul>',
];
```

Test import, direct keyboard typing, paste, save HTML, controlled prop update, remount, undo/redo, paragraph↔heading conversion, and list conversion. Include en-US/ar-SA/he-IL resume locales separately from UI locale. PDF controls use defaultResumeData, summary-only page, Helvetica first; CJK controls use existing Unicode-space fixture families. Compare exact stored codepoints, logical first-content x coordinate, line widths, and all text after wrapping.

For narrow layout clone existing `paragraph-indent.integration.test.tsx` controls: Chikorita25%/35% sidebar, levels0/1/4/8, quoted and main text. Preserve both paragraph offset and literal leading content; never multiply offsets or cap away literal text. DOCX verify XML text preservation plus chosen `w:tab`/tab-stop representation when relevant; inspect a rendered DOCX if claiming visual equivalence.

## Ordered execution and gates

### 1. Establish current round-trip boundaries

```sh
rtk proxy pnpm --filter web exec vitest run src/components/input/rich-input.indent.test.tsx
rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/paragraph-indent.integration.test.tsx src/unicode-spaces.integration.test.tsx
rtk proxy pnpm --filter @reactive-resume/docx exec vitest run src/paragraph-indent.test.ts
```

Expected: current characterization passes, including known ASCII collapse. Capture emitted versus reloaded HTML exactly; do not conclude preservation merely from initial typing. If any boundary now differs, stop and revise this plan around current source.

### 2. Write the approved text contract as failing acceptance tests

Add desired red assertions for marked ordinary text while retaining unmarked legacy characterization. Preserve old paragraph/list and Unicode controls. Store policy examples in test names/data: one tab has four space advances at the same font size/style; two tabs have eight; a tab after one versus three letters has the same added advance; legacy unmarked prose continues normalizing as before. Assert existing Enter/Shift+Enter behavior remains unchanged.

Prove parser, serializer, editor CSS, PDF HTML normalization, and DOCX all agree on the marker contract. Add user-input tests beginning with an unmarked paragraph: type a leading space/tab, save emitted HTML, remount it, and verify both marker and text survive. External `setContent(..., { emitUpdate: false })` must not emit a save. Add a pretty-printed unmarked import control to prove old document whitespace is still normalized without migration.

**Gate:** desired marked-text regression fails at the first known boundary before runtime changes; legacy unmarked characterization still passes. Product approval is already recorded above; no further answer is required.

### 3. Implement per-boundary changes with round-trip stability

Candidate web files: `rich-input.tsx`, a focused whitespace extension, `rich-input.indent.test.tsx` or new `rich-input.whitespace.test.tsx`. PDF candidates: `rich-text-html.ts`, `rich-text-renderers.ts`, and dependency normalization patch only if the contract requires it. DOCX candidate: `html-to-docx.ts` and its tests. UI labels follow Lingui; named props and existing editor/provider conventions apply. Parse/render the approved attribute on paragraph and heading nodes, preserving whitespace only inside those marked nodes; apply scoped `white-space: pre-wrap` to the editor display. In PDF, pass equivalent node-local preservation through the existing HTML renderer instead of disabling collapse for the entire document. DOCX preserves the literal text and expands tab display according to the four-space judgment.

Keep authored whitespace as an intentional persisted contract rather than replacing all spaces with NBSP, which changes line breaking and copy/paste. Preserve bold-boundary whitespace normalization and explicit list ownership. Expand literal tabs to the selected four-space advance only within the chosen preservation context, including RTL and mixed-font runs; do not equate a tab with paragraph indentation or add position-dependent tab stops. If dependency changes are required, cover CJS/ESM and frozen install.

**Gate:** all approved examples round-trip byte/codepoint semantics as specified; non-literal prose and Unicode regressions remain unchanged. Long/narrow content stays complete across physical pages.

### 4. Production acceptance

Add `tests/e2e/specs/literal-whitespace.spec.ts` using disposable authenticated fixture and dedicated database/unique port. Type/paste examples in builder, save/reload, export JSON/PDF/DOCX, and compare source versus each output. Use actual downloaded PDF text positions/raster; inspect DOCX XML and rendered output for the agreed tab contract. A DOCX XML literal tab alone is insufficient proof of visual spacing.

```sh
rtk proxy pnpm --filter web typecheck
rtk proxy pnpm --filter @reactive-resume/pdf typecheck
rtk proxy pnpm --filter @reactive-resume/docx typecheck
rtk proxy pnpm exec turbo boundaries
rtk proxy pnpm build
rtk proxy dotenvx run -f .env.local -- pnpm exec playwright test tests/e2e/specs/literal-whitespace.spec.ts --reporter=list
```

Expected all pass; each chosen literal input survives save/reload and exports with approved geometry. New spec is a proposed addition. Run write-capable `pnpm check` with diff inspection; independent review before authorized publication; never merge.

## Done / STOP

- [ ] Approved ordinary-text marker contract, four-space tab judgment and existing line-break behavior implemented and tested.
- [ ] Typed and imported whitespace survive or normalize exactly as approved through reload, not only live editing.
- [ ] Paragraph levels0–8, narrow inset cap, lists, quotes, RTL, Unicode spaces and marks retain existing behavior.
- [ ] PDF and DOCX evidence matches the approved text contract; limitations named separately.

Stop if preserving marked ordinary whitespace unexpectedly changes unmarked imported prose layout, if a proposed tab solution changes bidi semantics without a reference, or if any fix needs unrelated schema/storage work. Do not close the original literal-whitespace request based solely on existing paragraph indentation controls.
