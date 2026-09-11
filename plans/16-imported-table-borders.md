# Plan 16: Preserve imported table structure and isolate missing-border reports

> Product direction approved on 2026-09-05: add Tiptap table support. This remains a plan for later implementation. Diagnostic steps are ready now. Follow gates in order; do not infer that a controlled table explains the historical screenshot. Index updates belong to the coordinating maintainer.

## Status

- **Issue:** [#3196](https://github.com/amruthpillai/reactive-resume/issues/3196).
- **Planned at:** `7a98f6662`, 2026-09-05. Rendering source remains identical in the planning checkout.
- **Priority / effort / risk:** P1 / M–L / high for editor changes, medium for renderer compatibility. Incorrect normalization destroys authored structure.
- **Confidence:** High for the two controlled limitations below; low for their equivalence to the original report.
- **Readiness:** Diagnosis ready. Editable tables approved by the maintainer after clarification: “Yes, add it.” Add Tiptap table support to preserve structure and supported styling through editing, saving, and export.
- **Dependencies:** #3438 is already merged and must remain intact. No dependency on another unimplemented fix. Coordinate rich-input changes with Plan 19.

## Evidence, impact, and limits

The reporter used Ditgar on cloud, imported JSON, then updated a resume whose table lost its grid. The screenshot still shows text in three columns. No exact HTML/JSON or application version was supplied. [The maintainer's clarification](https://github.com/amruthpillai/reactive-resume/issues/3196#issuecomment-5552909919) explicitly distinguishes merged #3438, which fixed complete loss of text inside otherwise unrecognized semantic HTML wrappers. That fix does not establish border correctness. The custom-section-heading concern is separate and outside this plan.

A fresh controlled production probe at the planned source revision established:

| Stage | Inline CSS table | HTML `border="1"` table |
| --- | --- | --- |
| Import, save, reload | Six cells retain row/column positions; browser and server PDFs each contain 24 magenta border drawings | Six cells retain row/column positions, but no table border drawings |
| Edit an unrelated Basics field, save, reload | Stored HTML unchanged; both PDFs still contain 24 drawings | Stored HTML unchanged; borders still absent |
| Inspect the table's editor before typing | Editor DOM already contains one paragraph, although stored HTML still contains the table | Same normalization |
| Type `!` in that editor, save, reload | Stored HTML becomes one paragraph; columns and all border drawings disappear in both PDFs | Stored HTML becomes one paragraph; columns disappear |

The inline fixture's builder canvas contained 19,554 magenta pixels before and after the unrelated edit, and zero after the table edit, at 2381×3367 bitmap size. PDF drawing counts are stronger evidence than these resolution-specific pixel counts. Both production cases passed in 32.3 seconds. Fourteen direct PDF controls covered legacy/semantic mode and seven border representations: cell shorthand, cell longhand, and stylesheet rules each yielded 24 magenta drawings; row borders yielded 8; table-only borders 14; bare and HTML border-attribute tables none. A raster inspection confirmed six visible bordered cells.

**Interpretation:** RichInput currently cannot round-trip imported tables. Separately, the current HTML renderer ignores the legacy `border` attribute. Neither result reproduces the exact historical image: the first removes columns too, and the second depends on markup not supplied by the reporter. Do not close #3196 based on either controlled fix alone.

## Current source and drift gate

```sh
rtk proxy git diff --stat 7a98f6662..HEAD -- apps/web/src/components/input packages/pdf/src/templates/shared packages/pdf/src/semantic/rich-text-table.integration.test.tsx patches/react-pdf-html@2.1.5.patch
```

On source changes, inspect the excerpts below before proceeding. Stop if table support or HTML normalization changed.

- `apps/web/src/components/input/rich-input.tsx:65` defines `extensions`: StarterKit, TextStyle, Color, Highlight, TextAlign, ParagraphIndent. It contains no table/tableRow/tableHeader/tableCell extension; even code blocks are explicitly disabled. A CSS selected-cell class is not a table schema.
- `RichInput`, around lines 115–148:

  ```tsx
  content: value,
  onUpdate: ({ editor }) => {
    onChange(editor.getHTML());
  },
  // Prop changes must not trigger a save themselves.
  editor.commands.setContent(value, { emitUpdate: false });
  ```

- `packages/pdf/src/templates/shared/rich-text-html.ts`, `normalizeRichTextHtml`, preserves unknown block markup while assigning semantic hosts to relevant content. Keep its #3438 behavior.
- `packages/pdf/src/templates/shared/rich-text.tsx` supplies custom paragraph/list renderers; table/row/cell rendering falls through to `react-pdf-html`.
- Installed `react-pdf-html` 2.1.5 `dist/cjs/renderers.js`, `table` and cell renderers, use computed styles and do not map the HTML `border` attribute. `dist/cjs/styles.js` has no default table border width. Confirm the installed version against the lockfile before patching any dependency.
- `packages/pdf/src/semantic/rich-text-table.integration.test.tsx` already builds actual PDFs from `defaultResumeData`, uses `act(() => renderToBuffer(...))`, and asserts text coordinates. It does **not** inspect border operators. Extend this pattern, not a source-string assertion.

## Portable controlled fixture

Create the fixture in the proposed regression test; do not depend on advisor machine files. Import `defaultResumeData` from `@reactive-resume/schema/resume/default` and use:

```ts
const table = (attributes = '', cellStyle = '') =>
  `<table ${attributes}><tbody>${[
    ['Alpha', 'Beta', 'Gamma'], ['Delta', 'Epsilon', 'Zeta'],
  ].map(row => `<tr>${row.map(text =>
    `<td style="width: 100pt; padding: 4pt; ${cellStyle}">${text}</td>`
  ).join('')}</tr>`).join('')}</tbody></table>`;
const inline = table(
  'style="width: 300pt; border-collapse: collapse"',
  'border: 1pt solid #cc00cc',
);
const attribute = table('border="1" style="width: 300pt; border-collapse: collapse"');
const data = structuredClone(defaultResumeData);
data.basics.name = 'Border Probe';
data.picture.hidden = true;
data.summary.content = inline; // Repeat with attribute.
data.metadata.template = 'ditgar';
data.metadata.layout.pages = [{ fullWidth: true, main: ['summary'], sidebar: [] }];
data.metadata.typography.body.fontFamily = 'Helvetica';
data.metadata.typography.heading.fontFamily = 'Helvetica';
data.metadata.stylesheet = { mode: 'semantic', source: { languageVersion: 1, text: '@version 1;' } };
```

Repeat with `mode: 'legacy'`. The exact expected editor HTML before typing is `<p>AlphaBetaGammaDeltaEpsilonZeta</p>`; the current persisted result after typing is `<p>AlphaBetaGammaDeltaEpsilonZeta!</p>`. Stored HTML before mount, after mount without editing, and after the unrelated edit equals the original `inline`/`attribute` string byte-for-byte in this probe. These are characterization results, not desired behavior.

For border analysis, use PDF.js operator lists plus a color-specific raster assertion, or inspect generated PDFs with `pdfplumber`:

```python
import pdfplumber
with pdfplumber.open('table.pdf') as pdf:
    page = pdf.pages[0]
    drawings = page.curves + page.lines + page.rects
    pink = [d for d in drawings if any(
        isinstance(d.get(k), (tuple, list)) and
        len(d[k]) == 3 and all(abs(a-b) < 0.001 for a,b in zip(d[k], (0.8,0,0.8)))
        for k in ('stroking_color', 'non_stroking_color'))]
    print(len(pink))
```

Expected current inline output: 24. Use a color absent from template decorations. Text extraction alone must never satisfy a border regression.

## Approved scope and diagnostic gate

Allowed after the diagnostic regression gate: `rich-input.tsx`, a new `rich-input.table.test.tsx`, relevant web package dependency manifest/lockfile for native table extensions, the existing table PDF integration test, a focused `tests/e2e/specs/imported-table.spec.ts`, and the smallest necessary shared HTML normalization seam. Any dependency patch must cover installed CJS and ESM and be reproduced by frozen install.

Out of scope: custom section heading policy, global table borders on all imported HTML, blanket sanitization rewrites, saved resume schema migrations, arbitrary HTML editing, merging PRs, and speculative changes to the PDF pipeline.

The maintainer selected editable tables. The following distinction explains the selected scope:

1. **Editable tables:** support table, row, cell, and header schema nodes and preserve supported widths/spans/borders during editing. Higher effort; gives users actual editing rather than silent conversion.
2. **Preserve unsupported content:** protect markup that cannot round-trip and expose an accessible read-only notice. Do not replace source with normalized HTML merely to mount an editor. Destructive conversion UX is outside this repair; no extra conversion decision blocks supported-table editing.

**Approved direction (2026-09-05):** native editing of already-imported supported tables, with a preservation fallback for markup/attributes that cannot round-trip. The renderer already displays tables, and silently flattening content on editing is a data-loss defect. The maintainer explicitly approved adding table support after clarification that imported tables currently flatten when edited. An insertion toolbar, arbitrary HTML editor, or spreadsheet-like controls are not required for this bounded repair. Supported tables must be editable. Protection is a fallback for unsupported markup, not a replacement for the approved editing support.

Routine judgments do not need separate answers: preserve source while unsupported; retain explicit CSS precedence; never add a default grid to borderless tables. Legacy HTML `border` mapping is a diagnostic fork, not another initial product blocker. If the exact reporter fixture proves that attribute caused border loss, propose the smallest compatibility mapping with positive/zero/malformed-value tests; otherwise defer it instead of widening scope speculatively.

## Ordered execution

### 1. Lock the failing boundary

- Mount RichInput with the inline fixture using the provider/DOM pattern in `rich-input.indent.test.tsx`.
- Assert mounting calls no `onChange`; inspect editor JSON and DOM; type a single character; capture emitted HTML and remount it.
- Add a desired editable-table round-trip assertion and a separate unsupported-markup preservation assertion. They must fail on current code before the implementation.
- Separately render original, unrelated-edit, and table-edit HTML through the actual PDF helper. Save drawing counts and six-cell coordinates.

**Gate:** `rtk proxy pnpm --filter web exec vitest run src/components/input/rich-input.table.test.tsx` must first fail specifically because structure/source was lost. Existing `rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/semantic/rich-text-table.integration.test.tsx` must pass. If initial source already lacks a table, stop: renderer work cannot recover absent structure.

### 2. Obtain and classify the historical fixture

Read the existing issue through `rtk proxy gh issue view 3196 --repo amruthpillai/reactive-resume --json body,comments`. Do not post a new comment. If no source arrives, record “historical equivalence unverified” and continue only the independently authorized data-loss repair.

Compare source tags/styles before editing with the exported JSON after editing. Branch on the first difference: table removed → editor; markup retained but only `border` attribute present → compatibility policy; supported inline borders retained yet missing from PDF → renderer regression. For the last branch, minimize to one table, one style, one template before changing code.

**Gate:** retain a sanitized minimal source fixture and an assertion distinguishing these branches. A screenshot cannot pass this gate.

### 3. Implement the approved editable-table support

For native tables, use actual Tiptap nodes; `extensions: [...existing, Table, TableRow, TableHeader, TableCell]` is only a shape, not sufficient implementation. Preserve declared cell widths, colspan/rowspan, and supported border styles with parse/render attributes; test merged cells, multiple paragraphs, inline marks, paste, undo/redo, and unrelated prop updates. Do not blindly retain arbitrary style attributes without the existing content policy. Keep `emitUpdate: false` for external data.

For the unsupported-markup preservation fallback, detect unsupported structured content before destructive editor normalization, retain exact authored HTML in builder state, and prohibit ordinary editor changes from overwriting it. Test keyboard access, locked resumes, dismiss/reopen behavior, and explicit conversion cancellation. Do not auto-convert tables into plain paragraphs.

If attribute mapping is selected, normalize only the agreed legacy table attribute into equivalent scoped style while honoring explicit CSS precedence. Characterize absent/zero/malformed values and existing inline borders; do not impose a default grid on borderless tables.

**Gate:** desired DOM regression passes; emitted/reloaded HTML preserves the approved structure or protected original bytes. PDF cell text and border counts pass before/after edits in both stylesheet modes.

### 4. Production acceptance

Use `tests/e2e/fixtures/test.ts` disposable authenticated account, dedicated database, unique `APP_URL`/`PORT`, and no production credentials. Import JSON through the dashboard's empty-state “Import an existing resume” heading, wait for save completion, reload, edit unrelated Basics, reload, then edit the table field and reload. At each stage capture stored HTML, actual preview bitmap, browser Download PDF, and public/server PDF for the same saved revision.

```sh
rtk proxy pnpm --filter web typecheck
rtk proxy pnpm --filter @reactive-resume/pdf typecheck
rtk proxy pnpm exec turbo boundaries
rtk proxy pnpm build
rtk proxy dotenvx run -f .env.local -- pnpm exec playwright test tests/e2e/specs/imported-table.spec.ts --reporter=list
```

All commands exit 0; six distinct cells remain in two rows/three columns and the agreed border representation remains visible in all three surfaces. Run write-capable `pnpm check` only with awareness of its mutations; inspect the diff. Independent review precedes normal PR publication when authorized. Never merge.

## Done and STOP conditions

- [ ] Controlled data-loss regression has red/green evidence and survives persistence, undo, and import/export.
- [ ] Border operators and raster assertions cover supported styles; no text-only success claim.
- [ ] Product decision is recorded explicitly; no implicit default-grid or unsupported-content conversion.
- [ ] Historical #3196 disposition remains separate unless exact source establishes equivalence.
- [ ] #3438 semantic content tests and package boundaries pass; no source outside scope changed.

Stop if a fix requires a broader HTML security policy, persisted schema migration, or arbitrary editor extension adoption. Stop if the original markup is unavailable and proposed code addresses only a guessed representation. The maintainer owns issue closure and plan index updates.
