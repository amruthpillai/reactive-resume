# Semantic CSS Stylesheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the structured Custom Styles form with Semantic CSS, a copy-pastable Semantic CSS language that can style
every registered PDF template part while preserving builder-owned content and the last valid rendered stylesheet.

**Architecture:** A universal compiler under `@reactive-resume/resume/stylesheet` parses real CSS syntax into a
versioned, environment-neutral program and resolves it against an immutable semantic resume tree. `@reactive-resume/pdf`
builds that tree, supplies template defaults, applies resolved styles and structural props to existing React PDF
primitives without adding wrappers, and owns PDF preflight and public projections. A dedicated API state machine stores
editable and applied source with revision/render-data compare-and-swap, while a lazy CodeMirror editor communicates
through a browser worker and a serialized mutation queue.

**Tech Stack:** TypeScript 7, Zod 4, React 19, React PDF 4.5, Vitest, oRPC, Drizzle/PostgreSQL, Zustand, Vite workers,
CSSTree, `@bramus/specificity`, CodeMirror 6, Prettier standalone, RFC 8785 `canonicalize`, Lingui, Base UI/shadcn.

## Global Constraints

- Follow `docs/superpowers/specs/2026-07-28-semantic-css-stylesheet-design.md`.
- Use Node.js 24, pnpm, existing workspace export maps, and `turbo boundaries`.
- Put the universal compiler in `packages/resume` per the repository placement rules; do not create a parallel domain
  package and do not put compiler behavior in `packages/utils`.
- Add dependencies with `@latest` through pnpm, then commit the resolved lockfile.
- Semantic CSS affects PDF preview, public PDF rendering, and PDF export only. DOCX and Markdown remain unchanged.
- Design, Typography, Layout, Page, and Picture controls remain the base layer. Semantic CSS overrides exposed visual output.
- Typography remains the only font-family selector. Reject `font-family`, `@font-face`, `@import`, `url()`, generated
  content, executable expressions, browser interaction states, animations, CSS Grid, and remote assets.
- Store exact editable source and last-valid applied source. Never persist a compiled AST.
- Treat the stylesheet atomically: any compiler error preserves the previous applied source. Do not apply valid fragments
  from an otherwise invalid candidate.
- Generated/default source begins with `@version 1;`. A missing directive is a v1 warning for hand-written input;
  duplicate, malformed, unsupported, or metadata-mismatched directives are errors.
- Expose builder values through read-only `--resume-*` system variables. User declarations using the reserved prefix are
  errors.
- Never double-apply legacy `styleRules` and Semantic CSS. Persisted `mode` selects exactly one custom-style path.
- Legacy conversion stays inactive until explicit activation and must pass behavioral parity and bounded PDF preflight.
- Semantic instrumentation must not add React PDF layout wrappers. Bind node keys and resolved presentation to existing
  `Page`, `View`, `Text`, `Image`, `Link`, HTML-renderer, and icon nodes.
- Match selectors against immutable source order; apply `display: none` and stable `order` once after cascade.
- Keep editable source, comments, diagnostics, and applied source owner-only. Public responses receive only a validated,
  source-free resolved projection.
- Use TDD for every behavioral change: write one failing test, run it and confirm the intended failure, implement the
  minimum behavior, rerun focused and neighboring tests, then commit.
- When a new TypeScript module does not yet exist, add only its typed export shell with functions that throw
  `"Not implemented"` after writing the test but before the RED run. Confirm the test reaches the behavioral assertion
  and fails on that sentinel; a module-resolution/type error is not an acceptable RED result. Replace the sentinel in
  the same task and never commit a throwing scaffold.
- Use early one-line returns and named TypeScript types for non-trivial props and generic interfaces.
- UI work uses existing `@reactive-resume/ui` components and semantic Tailwind tokens. Desktop focus mode resizes the
  existing right panel; mobile focus mode uses the existing Base UI `Sheet` with `SheetTitle`.
- Do not run broad mutating `pnpm check` until the final integration gate. Use focused Biome/Markdown checks while tasks
  are in progress.

---

## Research Decisions Incorporated

| Decision | Application |
| --- | --- |
| CSS parser | Use `css-tree` for tolerant CSS parsing, source locations, AST walking, generation of machine-created CSS, and baseline lexer support. Keep exact source outside the AST because ordinary comments/spacing are omitted. |
| Specificity | Use `@bramus/specificity/core#calculateForAST` on already parsed CSSTree selector nodes. Lock behavior with `:is()`, `:not()`, `:where()`, and `:nth-*` golden tests. |
| Canonical hashing | Use `canonicalize` for RFC 8785 serialization and `globalThis.crypto.subtle.digest("SHA-256", …)` for the domain-separated public render hash in Node 24 and browsers. |
| Editor | Use CodeMirror 6 directly, without a React wrapper. Lazy-load the editor when Custom Styles opens. |
| Formatter | Lazy-load `prettier/standalone` and `prettier/plugins/postcss` only when the user selects **Format**. Use `formatWithCursor`; never format on save or paste. |
| Expanded editor | Resize the existing desktop right panel toward its 45% maximum and restore the prior layout on exit. Use `Sheet` only on mobile, where the preview already lives in a separate tab. |
| Shared tokens | Inject read-only colors, typography metrics, page metrics, sidebar width, picture metrics, and final page dimensions through `--resume-*`. Do not expose font family or picture URL. |
| No-wrapper API | Resolve structural behavior before React rendering; use a leaf `useResolvedNode(nodeKey)` hook only to apply styles/primitive props to existing nodes. |
| Acceptance fixtures | Turn issues #3146, #3134, #3137, #2223, and #3199 into named compiler/PDF/editor regression fixtures. |
| Future graphics | Record gradients and general box shadows as a later SVG-backed extension. They are not part of the v1 property adapter. |

## Milestones and Dependency Order

1. **Compiler foundation:** schema, parser, diagnostics, registries, selector matching, cascade, serialization, hashing.
2. **Dormant backend safety:** revision columns, render-data version, preservation, flags, no authoring UI.
3. **Semantic PDF runtime:** descriptor tree, all template manifests, adapter, structural props, issue fixtures.
4. **Migration and API:** behavioral converter, parity gate, state-machine mutation, preflight, public projection.
5. **Web authoring:** store, worker, CodeMirror shell, diagnostics, completion, formatting, focus mode.
6. **Integration and rollout:** preview/export/public paths, docs, all-template visual/E2E gates, backend-first flags.

Each milestone is testable and reviewable before the next begins. Do not expose the authoring flag until milestones 1–4
are green.

## File Responsibility Map

### `packages/schema`

- Create `packages/schema/src/resume/stylesheet.ts`: persisted source/applied/mode schemas and shared wire types.
- Create `packages/schema/src/resume/stylesheet.test.ts`: tolerant legacy compatibility and strict new-value tests.
- Modify `packages/schema/src/resume/data.ts`: optional `metadata.stylesheet`; preserve `metadata.styleRules`.
- Modify `packages/schema/package.json`: export `./resume/stylesheet`.

### `packages/resume`

- Create `packages/resume/src/stylesheet/types.ts`: diagnostics, semantic node, compiled program, resolved style, public
  projection, and base-setting types.
- Create `packages/resume/src/stylesheet/version.ts`: `@version` parsing contract and immutable compiler dispatch.
- Create `packages/resume/src/stylesheet/parse.ts`: CSSTree adapter and source-range normalization.
- Create `packages/resume/src/stylesheet/registry/semantic.ts`: node kinds, parentage, attributes, roles, fields, and
  registry fingerprint input.
- Create `packages/resume/src/stylesheet/registry/properties.ts`: supported property grammar, inheritance,
  applicability, shorthands, structural props, and hard technical bounds.
- Create `packages/resume/src/stylesheet/registry/system-variables.ts`: read-only `--resume-*` catalog and injection.
- Create `packages/resume/src/stylesheet/selector.ts`: selector validation, specificity, and immutable-tree matching.
- Create `packages/resume/src/stylesheet/values.ts`: variables, colors, dimensions, shorthands, and forbidden functions.
- Create `packages/resume/src/stylesheet/limits.ts`: immutable v1 resource limits and failure codes.
- Create `packages/resume/src/stylesheet/cache.ts`: bounded process-local compile cache.
- Create `packages/resume/src/stylesheet/compile.ts`: versioned parse/validate/compile entrypoint.
- Create `packages/resume/src/stylesheet/cascade.ts`: media, inheritance, source order, `!important`, structural pass.
- Create `packages/resume/src/stylesheet/analyze.ts`: no-match, ineffective-property, and extreme-value warnings.
- Create `packages/resume/src/stylesheet/serialize.ts`: deterministic escaping and generated Semantic CSS output.
- Create `packages/resume/src/stylesheet/render-hash.ts`: RFC 8785 canonicalization and SHA-256.
- Create `packages/resume/src/stylesheet/render-data.ts`: private render projection for versioning/preflight plus redacted
  public render projection for browser-verifiable hashing.
- Create `packages/resume/src/stylesheet/index.ts`: intentional public surface.
- Create colocated tests and `packages/resume/src/stylesheet/__fixtures__/v1/*.css`.
- Modify `packages/resume/package.json`: exports plus direct dependencies.

### `packages/db`, `packages/env`, root

- Modify `packages/db/src/schema/resume.ts`: `stylesheetRevision` and `renderDataVersion`.
- Generate a Drizzle migration and snapshot under `migrations/` using the repository generator; do not hand-name or edit
  generated snapshot metadata.
- Modify `packages/env/src/server.ts`: dormant authoring/default flags.
- Modify `turbo.json`: add both flag names to `globalEnv`.

### `packages/pdf`

- Create `packages/pdf/src/semantic/node-keys.ts`: stable node key factories.
- Create `packages/pdf/src/semantic/tree.ts`: shared descriptor tree construction.
- Create `packages/pdf/src/semantic/template-manifest.ts`: typed template manifest contract and aggregate registry.
- Create `packages/pdf/src/semantic/base-styles.ts`: builder/template defaults by node key.
- Create `packages/pdf/src/semantic/adapter.ts`: resolved domain values to React PDF `Style` and primitive props.
- Create `packages/pdf/src/semantic/context.tsx`: `SemanticRenderProvider` and `useResolvedNode`.
- Create `packages/pdf/src/semantic/resolve.ts`: compile/tree/cascade/adapter orchestration and mode selection.
- Create `packages/pdf/src/semantic/preflight.tsx`: bounded browser/server candidate render.
- Create `packages/pdf/src/semantic/legacy-converter.ts`: effective legacy conversion and parity comparison.
- Create `packages/pdf/src/semantic/public-projection.ts`: source-free resolved projection.
- Create `semantic.ts` beside each of the 15 template page files for regions and template parts.
- Modify shared primitives, sections, rich text, contacts, level display, all template pages, document, browser/server
  entrypoints, exports, and focused tests.

### `packages/api`, `apps/server`

- Create `packages/api/src/features/resume/stylesheet.ts`: oRPC router procedures.
- Create `packages/api/src/features/resume/stylesheet-service.ts`: transition state machine and CAS.
- Create `packages/api/src/features/resume/stylesheet-preflight.ts`: compile/preflight orchestration outside locks.
- Create `packages/api/src/features/resume/stylesheet-preservation.ts`: full-update/patch protection and render-data
  versioning.
- Create `packages/api/src/features/resume/public-style-projection.ts`: public projection query and cache.
- Create `packages/api/src/features/resume/public-pdf.ts`: exported public/password-aware fallback rendering service.
- Modify resume router, DTO, service, CRUD, versions, sharing, access policy, events, flags, and tests.
- Create `apps/server/src/workers/stylesheet-preflight.ts` and `apps/server/src/services/stylesheet-preflight.ts`:
  terminable resource-bounded worker and API-context runner.
- Create `apps/server/src/http/public-resume-pdf.ts`: authorized/rate-limited public fallback without changing signed
  owner-download behavior in `resume-pdf.ts`.

### `apps/web`

- Create `apps/web/src/features/resume/stylesheet/protocol.ts`: structured-clone-safe worker messages.
- Create `apps/web/src/features/resume/stylesheet/stylesheet.worker.ts`: compiler/analyzer worker.
- Create `apps/web/src/features/resume/stylesheet/worker-client.ts`: worker lifecycle and generation checks.
- Create `apps/web/src/features/resume/stylesheet/store.ts`: per-resume source/applied/revision/history/mutation queue.
- Create `apps/web/src/features/resume/stylesheet/editor.tsx`: direct CodeMirror host.
- Create `apps/web/src/features/resume/stylesheet/editor-extensions.ts`: lint, completion, hover, search, and color widgets.
- Create `apps/web/src/features/resume/stylesheet/formatter.ts`: lazy Prettier command.
- Create `apps/web/src/features/resume/stylesheet/toolbar.tsx`: copy, format, reset, activate, undo/redo, focus mode.
- Create `apps/web/src/features/resume/stylesheet/status.tsx`: applied/warning/error state.
- Create `apps/web/src/features/resume/stylesheet/legacy-banner.tsx`: inactive converted draft and activation.
- Create `apps/web/src/features/resume/stylesheet/focus-mode.ts`: desktop panel resize/restore and mobile sheet state.
- Add colocated happy-dom tests.
- Replace form internals in the existing Custom Styles route section with a lazy feature shell.
- Modify builder initialization, preview/export/public rendering, and version restore reinitialization.

### Documentation and E2E

- Replace `docs/guides/using-custom-styles.mdx` with Semantic CSS authoring/migration guidance.
- Create `docs/guides/semantic-css-reference.mdx` from registry-backed generated content.
- Create Playwright specs under `tests/e2e/specs/semantic-css/`.

## Normative v1 Property Adapter Matrix

The v1 registry and PDF adapter must cover these renderer properties under kebab-case names. Registry tests enumerate
each property and its allowed semantic/primitive kinds; PDF adapter tests fail when either side lacks an entry.

| Category | Properties |
| --- | --- |
| Flexbox | `align-content`, `align-items`, `align-self`, `flex`, `flex-direction`, `flex-wrap`, `flex-flow`, `flex-grow`, `flex-shrink`, `flex-basis`, `justify-content`, `gap`, `row-gap`, `column-gap`; Semantic CSS `order` is resolved structurally before rendering. |
| Layout/position | `aspect-ratio`, `bottom`, `display`, `left`, `position`, `right`, `top`, `overflow`, `z-index`. |
| Dimensions | `width`, `height`, `min-width`, `min-height`, `max-width`, `max-height`. |
| Color | `color`, `background-color`, `opacity`. |
| Text | `direction`, `font-size`, `font-style`, `font-weight`, `letter-spacing`, `line-height`, `max-lines`, `text-align`, `text-decoration`, `text-decoration-color`, `text-decoration-style`, `text-indent`, `text-overflow`, `text-transform`, `vertical-align`. `font-family` is deliberately rejected. |
| Image | `object-fit`, `object-position`; picture-only `-resume-shadow-color` and `-resume-shadow-width` map the renderer properties already used by the template base styles. |
| Margin/padding | `margin`, `margin-top/right/bottom/left`, `margin-horizontal`, `margin-vertical`, `padding`, `padding-top/right/bottom/left`, `padding-horizontal`, `padding-vertical`. |
| Borders | `border`, `border-color/style/width`, every per-side color/style/width, and every corner radius. |
| Transform | `transform` functions `rotate`, `scale`, `scale-x/y`, `translate`, `translate-x/y`, `skew`, `skew-x/y`, `matrix`, plus `transform-origin`. |
| Pagination/structure | `display: none`, `order`, `break-before`, `break-inside`, `orphans`, `widows`, page `size`, `-resume-fixed`, `-resume-min-presence-ahead`. |

Applicability rules:

- `page`: page style plus page `size`; no text-only properties unless inherited by a text descendant.
- container nodes backed by `View`: Flexbox, layout, dimensions, colors, spacing, borders, transforms.
- text/field/name/headline/strong/mark/list content: text, color, spacing supported by the backing `Text`.
- `link`: text properties plus link container properties supported by React PDF.
- `picture`: image, dimensions, spacing, borders, transforms, and the two supported shadow extensions.
- `icon`/level decorations: adapter-supported color/opacity/size; `font-size` maps to explicit icon size as documented.
- declarations valid in the language but ineffective on the selected kind produce warnings; unknown or unsupported
  properties are errors.

Explicit v1 exclusions include `font-family`, `@font-face`, `@import`, `url()`, `src`, generated `content`, Grid,
filters, blend modes, gradients, general `box-shadow`, animations, transitions, and interactive pseudo-classes.

---

### Task 1: Add Persisted Stylesheet Contracts

**Files:**
- Create: `packages/schema/src/resume/stylesheet.ts`
- Create: `packages/schema/src/resume/stylesheet.test.ts`
- Modify: `packages/schema/src/resume/data.ts`
- Modify: `packages/schema/package.json`

**Interfaces:**
- Produces: `StylesheetSource`, `SemanticStylesheet`, `StylesheetMode`,
  `stylesheetSourceSchema`, `semanticStylesheetSchema`, `EMPTY_SEMANTIC_CSS_SOURCE`.
- Consumed by: compiler, API, PDF mode selection, web store, import/export.

- [ ] **Step 1: Write failing schema tests**

```ts
import { describe, expect, it } from "vitest";
import { resumeDataSchema } from "./data";
import { defaultResumeData } from "./default";
import { semanticStylesheetSchema } from "./stylesheet";

describe("semanticStylesheetSchema", () => {
	it("preserves separate editable and applied sources", () => {
		const result = semanticStylesheetSchema.parse({
			mode: "semantic",
			source: { languageVersion: 1, text: "@version 1;\nsection {" },
			applied: { languageVersion: 1, text: "@version 1;\nsection { color: red; }\n" },
		});

		expect(result.source.text).toContain("section {");
		expect(result.applied.text).toContain("color: red");
	});

	it("keeps resumes without a stylesheet valid for legacy rendering", () => {
		expect(resumeDataSchema.parse(defaultResumeData).metadata.stylesheet).toBeUndefined();
	});

	it("rejects non-positive language versions", () => {
		expect(
			semanticStylesheetSchema.safeParse({
				mode: "semantic",
				source: { languageVersion: 0, text: "" },
				applied: { languageVersion: 1, text: "" },
			}).success,
		).toBe(false);
	});
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `pnpm --filter @reactive-resume/schema test -- src/resume/stylesheet.test.ts`

Expected: FAIL on the `Not implemented` schema shell or the first stylesheet assertion, not on module resolution.

- [ ] **Step 3: Implement the strict new schema and tolerant optional metadata field**

```ts
// packages/schema/src/resume/stylesheet.ts
import { z } from "zod";

export const EMPTY_SEMANTIC_CSS_SOURCE = "@version 1;\n";

export const stylesheetSourceSchema = z.strictObject({
	languageVersion: z.number().int().positive(),
	text: z.string(),
});

export const semanticStylesheetSchema = z.strictObject({
	mode: z.enum(["legacy", "semantic"]),
	source: stylesheetSourceSchema,
	applied: stylesheetSourceSchema,
});

export type StylesheetSource = z.infer<typeof stylesheetSourceSchema>;
export type SemanticStylesheet = z.infer<typeof semanticStylesheetSchema>;
export type StylesheetMode = SemanticStylesheet["mode"];
```

Add `stylesheet: semanticStylesheetSchema.optional()` to `metadataSchema`. Do not add it to `defaultResumeData`; absence
is the backwards-compatible legacy discriminator. Add the explicit package export.

- [ ] **Step 4: Verify schema behavior and neighboring resume tests**

Run:

```bash
pnpm --filter @reactive-resume/schema test -- src/resume/stylesheet.test.ts src/resume/data.test.ts src/resume/default.test.ts
pnpm --filter @reactive-resume/schema typecheck
```

Expected: PASS with all existing `styleRules` tests unchanged.

- [ ] **Step 5: Commit**

```bash
git add packages/schema
git commit -m "feat(schema): add semantic stylesheet contracts"
```

---

### Task 2: Add Parser, Diagnostics, and Version Dispatch

**Files:**
- Create: `packages/resume/src/stylesheet/types.ts`
- Create: `packages/resume/src/stylesheet/diagnostics.ts`
- Create: `packages/resume/src/stylesheet/version.ts`
- Create: `packages/resume/src/stylesheet/parse.ts`
- Create: `packages/resume/src/stylesheet/compile.ts`
- Create: `packages/resume/src/stylesheet/version.test.ts`
- Create: `packages/resume/src/stylesheet/parse.test.ts`
- Create: `packages/resume/src/stylesheet/index.ts`
- Modify: `packages/resume/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `compileStylesheet(source): CompileStylesheetResult`, `SemanticCssDiagnostic`, `SourceRange`,
  `SUPPORTED_SEMANTIC_CSS_VERSIONS`.
- Consumes: `StylesheetSource` from Task 1.

- [ ] **Step 1: Install direct parser and specificity dependencies**

Run:

```bash
pnpm --filter @reactive-resume/resume add css-tree@latest @bramus/specificity@latest canonicalize@latest
pnpm --filter @reactive-resume/resume add -D fast-check@latest
```

Expected: `packages/resume/package.json` and `pnpm-lock.yaml` list direct resolved dependencies.

- [ ] **Step 2: Write failing parser/version tests**

```ts
import { describe, expect, it } from "vitest";
import { compileStylesheet } from "./compile";
import { parseStylesheet } from "./parse";

describe("compileStylesheet", () => {
	it("compiles canonical version-one source", () => {
		const result = compileStylesheet({
			languageVersion: 1,
			text: "@version 1;\nsection { color: #123456; }\n",
		});

		expect(result.program?.languageVersion).toBe(1);
		expect(result.diagnostics).toEqual([]);
	});

	it("warns when version-one source omits the directive", () => {
		const result = compileStylesheet({ languageVersion: 1, text: "section { color: red; }" });

		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "MISSING_VERSION_DIRECTIVE", severity: "warning" }),
		);
	});

	it("rejects a directive that disagrees with persisted metadata", () => {
		const result = compileStylesheet({ languageVersion: 1, text: "@version 2;" });

		expect(result.program).toBeNull();
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "VERSION_MISMATCH", severity: "error" }),
		);
	});

	it("returns exact ranges for malformed declarations and keeps a recoverable parse tree", () => {
		const result = parseStylesheet("@version 1;\nsection { color red; }\nitem { opacity: .5; }");

		expect(result.diagnostics[0]?.range.start.line).toBe(2);
		expect(result.rules).toHaveLength(2);
	});
});
```

- [ ] **Step 3: Verify RED**

Run: `pnpm --filter @reactive-resume/resume test -- src/stylesheet/version.test.ts src/stylesheet/parse.test.ts`

Expected: FAIL on the parser/compiler sentinel or the first version/range assertion, not on module resolution.

- [ ] **Step 4: Implement the CSSTree adapter and immutable v1 dispatch**

```ts
export type DiagnosticSeverity = "error" | "warning";

export type SourcePosition = {
	line: number;
	column: number;
	offset: number;
};

export type SourceRange = {
	start: SourcePosition;
	end: SourcePosition;
};

export type SemanticCssDiagnostic = {
	code: string;
	severity: DiagnosticSeverity;
	message: string;
	range: SourceRange;
};

export type CompileStylesheetResult = {
	program: StyleProgram | null;
	diagnostics: readonly SemanticCssDiagnostic[];
};
```

Configure CSSTree with `positions: true`, `parseCustomProperty: true`, `onParseError`, and token/comment callbacks.
Convert `Raw` nodes into errors without replacing raw source. Parse `@version` as a top-level at-rule: generated
source has exactly one directive; v1 hand-written source without one compiles with a warning; duplicates, non-positive
values, unsupported values, and metadata mismatches block the program.

- [ ] **Step 5: Verify parser tests, Unicode ranges, browser-safe imports, and typecheck**

Run:

```bash
pnpm --filter @reactive-resume/resume test -- src/stylesheet/version.test.ts src/stylesheet/parse.test.ts
pnpm --filter @reactive-resume/resume typecheck
```

Expected: PASS; diagnostics use one-based line/column and zero-based offsets consistently.

- [ ] **Step 6: Commit**

```bash
git add packages/resume/package.json packages/resume/src/stylesheet pnpm-lock.yaml
git commit -m "feat(resume): add Semantic CSS parser and versioning"
```

---

### Task 3: Add Semantic, Property, and System-Variable Registries

**Files:**
- Create: `packages/resume/src/stylesheet/registry/semantic.ts`
- Create: `packages/resume/src/stylesheet/registry/properties.ts`
- Create: `packages/resume/src/stylesheet/registry/system-variables.ts`
- Create: `packages/resume/src/stylesheet/registry/semantic.test.ts`
- Create: `packages/resume/src/stylesheet/registry/properties.test.ts`
- Create: `packages/resume/src/stylesheet/registry/system-variables.test.ts`
- Modify: `packages/resume/src/stylesheet/types.ts`
- Modify: `packages/resume/src/stylesheet/index.ts`

**Interfaces:**
- Produces: `SemanticNode`, `SemanticNodeKind`, `SEMANTIC_REGISTRY_V1`, `PROPERTY_REGISTRY_V1`,
  `SYSTEM_VARIABLE_REGISTRY_V1`, `createSystemVariables(base, page)`.
- Consumed by: selector compiler, cascade, PDF tree builder, editor completion/docs.

- [ ] **Step 1: Write failing registry tests**

```ts
it("injects builder values without exposing fonts or assets", () => {
	const variables = createSystemVariables(baseSettings, { width: 595.28, height: 841.89 });

	expect(variables["--resume-primary-color"]).toBe(baseSettings.design.colors.primary);
	expect(variables["--resume-sidebar-width"]).toBe(`${baseSettings.layout.sidebarWidth}%`);
	expect(variables["--resume-page-width"]).toBe("595.28pt");
	expect(Object.keys(variables)).not.toContain("--resume-font-family");
	expect(Object.keys(variables)).not.toContain("--resume-picture-url");
});

it("registers every stable semantic node and relationship", () => {
	expect(canContainNode("resume", "page")).toBe(true);
	expect(canContainNode("section", "item")).toBe(false);
	expect(canContainNode("section-items", "item")).toBe(true);
});

it("rejects unsupported browser and asset properties", () => {
	expect(PROPERTY_REGISTRY_V1["font-family"]).toBeUndefined();
	expect(PROPERTY_REGISTRY_V1["background-image"]).toBeUndefined();
	expect(PROPERTY_REGISTRY_V1.color?.appliesTo).toContain("field");
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm --filter @reactive-resume/resume test -- src/stylesheet/registry/semantic.test.ts src/stylesheet/registry/properties.test.ts src/stylesheet/registry/system-variables.test.ts
```

Expected: FAIL on the registry sentinel or the first catalog/parentage assertion, not on module resolution.

- [ ] **Step 3: Implement typed registries**

Register these semantic kinds:

```ts
export type SemanticNodeKind =
	| "resume"
	| "page"
	| "region"
	| "header"
	| "picture"
	| "name"
	| "headline"
	| "contact-list"
	| "contact-item"
	| "section"
	| "section-heading"
	| "section-items"
	| "item"
	| "item-header"
	| "field"
	| "link"
	| "icon"
	| "level"
	| "rich-text"
	| "rich-heading"
	| "blockquote"
	| "paragraph"
	| "list"
	| "list-item"
	| "list-item-content"
	| "list-marker"
	| "strong"
	| "emphasis"
	| "underline"
	| "strike"
	| "code"
	| "text-span"
	| "mark"
	| "hard-break"
	| "horizontal-rule"
	| "template-part";
```

The property registry covers React PDF-supported Flexbox, layout, dimensions, colors, text properties except
`font-family`, spacing, borders, transforms, object fit/position, and the structural properties `display`, `order`,
`break-before`, `break-inside`, `orphans`, `widows`, `size`, `-resume-fixed`, and `-resume-min-presence-ahead`.

Inject exactly these v1 reserved variables:

```text
--resume-primary-color
--resume-text-color
--resume-background-color
--resume-body-font-size
--resume-body-line-height
--resume-heading-font-size
--resume-heading-line-height
--resume-page-gap-x
--resume-page-gap-y
--resume-page-margin-x
--resume-page-margin-y
--resume-page-width
--resume-page-height
--resume-sidebar-width
--resume-picture-size
--resume-picture-rotation
--resume-picture-aspect-ratio
--resume-picture-border-radius
--resume-picture-border-width
--resume-picture-border-color
--resume-picture-shadow-width
--resume-picture-shadow-color
```

- [ ] **Step 4: Verify registries and export-map boundaries**

Run:

```bash
pnpm --filter @reactive-resume/resume test -- src/stylesheet/registry
pnpm --filter @reactive-resume/resume typecheck
pnpm exec turbo boundaries
```

Expected: PASS; `packages/resume` remains `runtime:universal` and `role:domain`.

- [ ] **Step 5: Commit**

```bash
git add packages/resume/src/stylesheet
git commit -m "feat(resume): define Semantic CSS registries and system tokens"
```

---

### Task 4: Implement Selector Validation, Specificity, and Matching

**Files:**
- Create: `packages/resume/src/stylesheet/selector.ts`
- Create: `packages/resume/src/stylesheet/selector.test.ts`
- Create: `packages/resume/src/stylesheet/__fixtures__/v1/selectors.css`
- Modify: `packages/resume/src/stylesheet/compile.ts`

**Interfaces:**
- Produces: `CompiledSelector`, `Specificity`, `compileSelector`, `matchesSelector`.
- Consumes: parsed CSSTree selectors and the semantic registry.

- [ ] **Step 1: Write failing selector tests**

```ts
it.each([
	["section[type=\"experience\"] > section-heading", "heading-experience", true],
	["region[placement=\"sidebar\"] section", "section-skills-sidebar", true],
	["section:is([type=\"experience\"], [type=\"education\"])", "section-education", true],
	["item:nth-child(2)", "item-second", true],
	["section:hover", "section-experience", false],
])("matches %s against the immutable semantic tree", (selector, nodeKey, expected) => {
	const result = compileSelector(selector);
	if (!result.selector) return expect(expected).toBe(false);
	expect(matchesSelector(result.selector, fixtureTree, nodeKey)).toBe(expected);
});

it("gives :where zero specificity and :is its most specific argument", () => {
	expect(getSpecificity(":where(#one) section")).toEqual([0, 0, 1]);
	expect(getSpecificity(":is(#one, section)")).toEqual([1, 0, 0]);
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @reactive-resume/resume test -- src/stylesheet/selector.test.ts`

Expected: FAIL on the selector sentinel or a matching/specificity assertion, not on module resolution.

- [ ] **Step 3: Implement allowed selectors and immutable-tree matching**

Support type/universal selectors, reflected `#id`, attribute operators, selector lists, descendant/child/adjacent/general
sibling combinators, the `:root` alias for the `resume` node, `:is`, `:where`, `:not`, `:first-child`, `:last-child`,
`:only-child`, `:nth-child`, and `:nth-of-type`. Reject pseudo-elements, interactive pseudo-classes, custom classes,
unknown elements/attributes/roles, and nested complexity beyond registry limits.

Use `calculateForAST` only after Semantic CSS validation. Store specificity as a plain `[ids, classes, types]` tuple so the
compiled program remains structured-clone-safe and independent of library classes.

- [ ] **Step 4: Verify selector behavior and dependency compatibility**

Run:

```bash
pnpm --filter @reactive-resume/resume test -- src/stylesheet/selector.test.ts
pnpm --filter @reactive-resume/resume typecheck
```

Expected: PASS, including CSS escapes, UUID attribute selectors, `role~=` token matching, and stable source-order sibling
positions.

- [ ] **Step 5: Commit**

```bash
git add packages/resume/src/stylesheet
git commit -m "feat(resume): add semantic selector matching"
```

---

### Task 5: Implement Values, Cascade, Media, and Structural Resolution

**Files:**
- Create: `packages/resume/src/stylesheet/values.ts`
- Create: `packages/resume/src/stylesheet/limits.ts`
- Create: `packages/resume/src/stylesheet/cache.ts`
- Create: `packages/resume/src/stylesheet/cascade.ts`
- Create: `packages/resume/src/stylesheet/analyze.ts`
- Create: `packages/resume/src/stylesheet/values.test.ts`
- Create: `packages/resume/src/stylesheet/cascade.test.ts`
- Create: `packages/resume/src/stylesheet/analyze.test.ts`
- Create: `packages/resume/src/stylesheet/__fixtures__/v1/portable-theme.css`
- Modify: `packages/resume/src/stylesheet/compile.ts`
- Modify: `packages/resume/src/stylesheet/index.ts`

**Interfaces:**
- Produces: `resolveStylesheet(program, tree, context): ResolveStylesheetResult`,
  `analyzeStylesheet(program, tree)`.
- Consumes: Tasks 2–4.

- [ ] **Step 1: Write failing cascade tests**

```ts
it("resolves template base, normal rules, important rules, specificity, and source order", () => {
	const result = resolveFixture(`
		@version 1;
		section-heading { color: red; }
		section[type="experience"] > section-heading { color: blue !important; }
		section#experience > section-heading { color: green; }
	`);

	expect(result.nodes["heading-experience"]?.style.color).toBe("blue");
});

it("keeps positional selectors based on source order before hiding and ordering", () => {
	const result = resolveFixture(`
		@version 1;
		item:nth-child(2) { display: none; }
		item:last-child { order: -1; }
	`);

	expect(result.renderTree.children.map((node) => node.key)).toEqual(["item-3", "item-1"]);
});

it("resolves read-only system variables in an otherwise valid program", () => {
	const result = resolveFixture(`
		@version 1;
		:root { --accent: var(--resume-primary-color); }
		name { color: var(--accent); }
	`);

	expect(result.nodes.name?.style.color).toBe(fixtureBase.design.colors.primary);
});

it("blocks the entire program when reserved system variables are reassigned", () => {
	const result = compileStylesheet({
		languageVersion: 1,
		text: "@version 1; :root { --resume-primary-color: red; } name { color: blue; }",
	});

	expect(result.program).toBeNull();
	expect(result.diagnostics).toContainEqual(
		expect.objectContaining({ code: "SYSTEM_VARIABLE_READONLY", severity: "error" }),
	);
});

it("allows small but technically renderable values and leaves aesthetics to warnings", () => {
	const result = compileStylesheet({
		languageVersion: 1,
		text: "@version 1; field { font-size: 3pt; }",
	});

	expect(result.program).not.toBeNull();
	expect(result.diagnostics).toContainEqual(
		expect.objectContaining({ code: "EXTREME_VALUE", severity: "warning" }),
	);
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm --filter @reactive-resume/resume test -- src/stylesheet/values.test.ts src/stylesheet/cascade.test.ts src/stylesheet/analyze.test.ts
```

Expected: FAIL on the cascade sentinel or a resolved-value/structure assertion, not on module resolution.

- [ ] **Step 3: Implement value normalization and two-pass resolution**

Implement:

1. Parse/expand shorthands and custom properties.
2. Resolve `var()` with fallbacks and cycle diagnostics.
3. Validate again after expansion so `url()` cannot hide inside variables/shorthands.
4. Convert `pt`, `in`, `mm`, `cm`, `px`, `%`, `vw`, `vh`, `em`, and `rem` to normalized domain values.
5. Resolve non-media page `size`, then media width/height/orientation; reject `size` inside media.
6. Match/cascade on the immutable source tree.
7. Calculate inheritance and CSS-wide keywords.
8. Apply `display: none` and stable `order` once to produce `renderTree`.
9. Return warnings separately from compiler errors.
10. Return `program: null` for any error and never invoke cascade/preflight for that candidate.

```ts
export type ResolveStylesheetInput = {
	program: StyleProgram;
	tree: SemanticNode;
	baseStyles: Readonly<Record<string, ResolvedNodeStyle>>;
	baseSettings: BaseSettingsSnapshot;
	pages: readonly AuthoredPageContext[];
};

export type ResolveStylesheetResult = {
	nodes: Readonly<Record<string, ResolvedNodeStyle>>;
	renderTree: SemanticNode;
	diagnostics: readonly SemanticCssDiagnostic[];
};
```

Define these shared plain-value types in `types.ts` before implementing the resolver:

```ts
export type ResolvedNodeStyle = {
	style: Readonly<Record<string, string | number>>;
	structural: StructuralPresentation;
	hidden: boolean;
	order: number;
};

export type ResolvedPageSize = "A4" | "LETTER" | { width: number; height?: number };

export type StructuralPresentation = {
	breakBefore?: "page";
	breakInside?: "avoid";
	fixed?: boolean;
	minPresenceAhead?: number;
	orphans?: number;
	widows?: number;
	pageSize?: ResolvedPageSize;
};

export type BaseSettingsSnapshot = Pick<ResumeData, "picture"> & {
	template: Template;
	design: Design;
	typography: Typography;
	page: Page;
	layout: Pick<Layout, "sidebarWidth">;
};
```

Freeze these v1 technical limits in `limits.ts` and return `RESOURCE_LIMIT` diagnostics when exceeded:

```ts
export const SEMANTIC_CSS_LIMITS_V1 = {
	maxSourceBytes: 128 * 1024,
	maxRules: 1_024,
	maxDeclarations: 8_192,
	maxSelectorsPerRule: 64,
	maxSelectorCodePoints: 2_048,
	maxCombinatorsPerSelector: 16,
	maxFunctionDepth: 16,
	maxVariableExpansionDepth: 32,
	maxMediaNesting: 4,
	maxSemanticNodes: 20_000,
	maxAbsoluteLengthPt: 100_000,
} as const;
```

Implement a process-local LRU of at most 128 compiled programs and 16 MiB estimated serialized size, keyed by language
version, source hash, compiler build ID, and registry fingerprint. Add `fast-check` properties for malformed Unicode,
escaped/case-varied `@import`/`@font-face`/`url()`/`src`, nested variables, and shorthand expansion; any error must return
no program and must not throw or hang.

- [ ] **Step 4: Verify focused and complete compiler suites**

Run:

```bash
pnpm --filter @reactive-resume/resume test -- src/stylesheet
pnpm --filter @reactive-resume/resume typecheck
```

Expected: PASS for cycles, fallback values, `!important`, inheritance, `revert`, units, media, structural directives,
resource limits, cache eviction, attack corpus, fuzz properties, and no-match warnings.

- [ ] **Step 5: Commit**

```bash
git add packages/resume/src/stylesheet
git commit -m "feat(resume): resolve Semantic CSS cascade and structure"
```

---

### Task 6: Add Deterministic Serialization and Public Render Hashing

**Files:**
- Create: `packages/resume/src/stylesheet/serialize.ts`
- Create: `packages/resume/src/stylesheet/render-hash.ts`
- Create: `packages/resume/src/stylesheet/render-data.ts`
- Create: `packages/resume/src/stylesheet/serialize.test.ts`
- Create: `packages/resume/src/stylesheet/render-hash.test.ts`
- Create: `packages/resume/src/stylesheet/render-data.test.ts`
- Modify: `packages/resume/src/stylesheet/index.ts`

**Interfaces:**
- Produces: `serializeGeneratedStylesheet`, `escapeCssComment`, `escapeCssString`, `projectRenderData`,
  `projectPublicRenderData`, `computeRenderDataHash`.
- Consumed by: converter, public projection, browser validation.

- [ ] **Step 1: Write failing serializer/hash tests**

```ts
it("serializes generated Semantic CSS deterministically and safely", () => {
	const output = serializeGeneratedStylesheet({
		languageVersion: 1,
		blocks: [
			{
				comment: "Bad */ label",
				selector: 'section[id="projects"] > section-heading',
				declarations: { color: "#123456", fontSize: "12pt" },
			},
		],
	});

	expect(output).toBe(
		'@version 1;\n\n/* Bad *\\/ label */\nsection[id="projects"] > section-heading {\n\tcolor: #123456;\n\tfont-size: 12pt;\n}\n',
	);
});

it("hashes logically equivalent public render inputs identically", async () => {
	const first = await computeRenderDataHash({ domainVersion: 1, data: { b: 2, a: 1 } });
	const second = await computeRenderDataHash({ domainVersion: 1, data: { a: 1, b: 2 } });

	expect(first).toBe(second);
});

it("separates resume render-data identity from stylesheet revision identity", () => {
	const legacy = projectRenderData(legacyData);
	const semanticPrivate = projectRenderData(semanticData);
	const semanticPublic = projectPublicRenderData(semanticData);

	expect(legacy.metadata.styleRules).toEqual(legacyData.metadata.styleRules);
	expect(semanticPrivate.metadata.styleRules).toBeUndefined();
	expect(semanticPrivate.metadata.stylesheet).toBeUndefined();
	expect(semanticPublic.metadata.styleRules).toBeUndefined();
	expect(semanticPublic.metadata.stylesheet).toBeUndefined();
	expect(semanticPublic.metadata.notes).toBeUndefined();
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm --filter @reactive-resume/resume test -- src/stylesheet/serialize.test.ts src/stylesheet/render-hash.test.ts src/stylesheet/render-data.test.ts
```

Expected: FAIL on the serializer/hash sentinel or deterministic output assertion, not on module resolution.

- [ ] **Step 3: Implement canonical output and domain-separated SHA-256**

Use `canonicalize` for RFC 8785 and hash UTF-8 bytes with Web Crypto. Prefix the canonical payload with
`reactive-resume:public-style-projection:v1\0`. Reject non-I-JSON values before canonicalization.

Implement both projections by constructing known schema fields rather than spreading the loose input. Include picture,
basics, summary, sections, custom sections, template/layout/page/design/typography, and:

- private legacy mode: active `styleRules`, no stylesheet data;
- private semantic mode: neither stylesheet data nor inactive legacy rules;
- public semantic mode: neither stylesheet source nor inactive legacy rules; resolved projection nodes carry styling;
- every mode: no notes, dashboard metadata, diagnostics, unknown loose-schema fields, or server revisions.

Use `projectRenderData` only for `renderDataVersion`, which tracks content/base settings and active legacy rules.
Semantic source/applied/mode changes increment only `stylesheetRevision`; preflight CAS checks both columns. Compute the
public hash over `projectPublicRenderData(data)` plus the source-free resolved nodes and projection fingerprints. The
browser has every hash input; `applied` and `stylesheetRevision` are never part of the public hash.

- [ ] **Step 4: Verify Node test vectors and browser-compatible typecheck**

Run:

```bash
pnpm --filter @reactive-resume/resume test -- src/stylesheet/serialize.test.ts src/stylesheet/render-hash.test.ts src/stylesheet/render-data.test.ts
pnpm --filter @reactive-resume/resume typecheck
```

Expected: PASS against RFC 8785 vectors, mode-sensitive render projections, unknown-field exclusion, and domain-version
mismatch cases.

- [ ] **Step 5: Commit**

```bash
git add packages/resume/src/stylesheet
git commit -m "feat(resume): serialize and hash Semantic CSS output"
```

---

### Task 7: Deploy Dormant Persistence Safety and Feature Flags

**Files:**
- Modify: `packages/db/src/schema/resume.ts`
- Generated: Drizzle migration and snapshot under `migrations/`
- Create: `packages/api/src/features/resume/stylesheet-preservation.ts`
- Create: `packages/api/src/features/resume/stylesheet-preservation.test.ts`
- Modify: `packages/api/src/features/resume/service.ts`
- Modify: `packages/api/src/features/resume/service.test.ts`
- Modify: `packages/api/src/features/resume/crud.ts`
- Modify: `packages/api/src/features/resume/versions.ts`
- Modify: `packages/api/src/dto/resume.ts`
- Modify: `packages/api/src/dto/resume.test.ts`
- Modify: `packages/env/src/server.ts`
- Modify: `packages/api/src/features/flags/router.ts`
- Modify: `turbo.json`

**Interfaces:**
- Produces DB columns `stylesheetRevision`, `renderDataVersion`; helpers
  `preserveServerStylesheet`, `hasRenderDataChanged`.
- Consumed by: dedicated stylesheet mutation and editor state.

- [ ] **Step 1: Write failing preservation/version tests**

```ts
it("preserves server-owned stylesheet when an old client replaces resume data", () => {
	const merged = preserveServerStylesheet(serverData, clientDataWithoutStylesheet);

	expect(merged.metadata.stylesheet).toEqual(serverData.metadata.stylesheet);
});

it("increments render-data version for visual/content changes but not notes or stylesheet drafts", () => {
	expect(hasRenderDataChanged(serverData, withChangedExperience)).toBe(true);
	expect(hasRenderDataChanged(serverData, withChangedNotes)).toBe(false);
	expect(hasRenderDataChanged(serverData, withChangedStylesheetOnly)).toBe(false);
});

it("keeps server concurrency columns out of ordinary resume DTOs", () => {
	const dto = toResume(rowWithStylesheetColumns, false);
	expect(dto).not.toHaveProperty("stylesheetRevision");
	expect(dto).not.toHaveProperty("renderDataVersion");
});

it("seeds empty semantic source only for the default-enabled cohort", () => {
	expect(createResumeData({ semanticCssDefault: true }).metadata.stylesheet).toEqual({
		mode: "semantic",
		source: { languageVersion: 1, text: "@version 1;\n" },
		applied: { languageVersion: 1, text: "@version 1;\n" },
	});
	expect(createResumeData({ semanticCssDefault: false }).metadata.stylesheet).toBeUndefined();
});

it("rejects active semantic imports while the dormant backend cannot validate them", async () => {
	await expect(importResume(activeSemanticImport)).rejects.toMatchObject({
		code: "SEMANTIC_STYLESHEET_UNAVAILABLE",
	});
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm --filter @reactive-resume/api test -- src/features/resume/stylesheet-preservation.test.ts src/features/resume/service.test.ts src/dto/resume.test.ts
```

Expected: FAIL on a preservation/version/DTO assertion after typed shells compile.

- [ ] **Step 3: Add columns and generate migration**

```ts
stylesheetRevision: pg.integer("stylesheet_revision").notNull().default(0),
renderDataVersion: pg.integer("render_data_version").notNull().default(0),
```

Run:

```bash
dotenvx run -f .env.local -- pnpm db:generate
git status --short migrations packages/db/src/schema/resume.ts
```

Expected: one generated migration directory containing `migration.sql` and `snapshot.json`; SQL adds both non-null
integer columns with zero defaults and performs no JSONB backfill.

- [ ] **Step 4: Refactor generic update/patch to preserve stylesheet atomically**

Use a short transaction with `SELECT … FOR UPDATE`, merge the server stylesheet into submitted data, compare the
output of `projectRenderData`, and increment `renderDataVersion` only when that projection changes. Reject JSON Patch
paths under `/metadata/stylesheet`; allow legacy `/metadata/styleRules` only while mode is legacy. Ordinary owner/public
resume DTOs explicitly omit both concurrency columns; only the dedicated stylesheet envelope exposes them.

- [ ] **Step 5: Add dormant flags**

```ts
FLAG_SEMANTIC_CSS_AUTHORING: z.stringbool().default(false),
FLAG_SEMANTIC_CSS_DEFAULT: z.stringbool().default(false),
```

Add both variables to `turbo.json.globalEnv`, expose `semanticCssAuthoring` and `semanticCssDefault`, and keep both false
by default.

Update resume creation/sample-data paths so `semanticCssDefault` seeds both empty v1 sources and semantic mode for new
resumes in the enabled cohort. Imported data keeps its imported/missing mode after validation rather than inheriting the
instance default. During this dormant task, reject imports containing `metadata.stylesheet` with
`SEMANTIC_STYLESHEET_UNAVAILABLE`; Task 13 replaces that temporary rejection with compiler/applied-source validation and
preflight before semantic imports are accepted.

- [ ] **Step 6: Verify migration, API behavior, flags, and boundaries**

Run:

```bash
pnpm --filter @reactive-resume/api test -- src/features/resume/stylesheet-preservation.test.ts src/features/resume/service.test.ts src/dto/resume.test.ts
pnpm --filter @reactive-resume/api typecheck
pnpm --filter @reactive-resume/db typecheck
pnpm exec turbo boundaries
```

Expected: PASS; old-client updates cannot remove stylesheet state and no client can activate Semantic CSS yet.

- [ ] **Step 7: Commit**

```bash
git add packages/db migrations packages/api packages/env turbo.json
git commit -m "feat(api): preserve dormant semantic stylesheet state"
```

---

### Task 8: Build the Shared Semantic Descriptor Tree

**Files:**
- Create: `packages/pdf/src/semantic/node-keys.ts`
- Create: `packages/pdf/src/semantic/binding-inventory.ts`
- Create: `packages/pdf/src/semantic/tree.ts`
- Create: `packages/pdf/src/semantic/tree.test.ts`
- Create: `packages/pdf/src/semantic/binding-inventory.test.ts`
- Create: `packages/pdf/src/semantic/field-registry.test.ts`
- Modify: `packages/pdf/package.json`
- Modify: `packages/pdf/src/templates/shared/rich-text-html.ts`

**Interfaces:**
- Produces: `buildSemanticTree`, stable node-key factories, standard field/role registry.
- Consumes: `ResumeData`, layout page, template, normalized rich text, semantic registry.

- [ ] **Step 1: Add the explicit workspace dependency**

Run: `pnpm --filter @reactive-resume/pdf add "@reactive-resume/resume@workspace:*"`

Expected: PDF package and lockfile directly declare the domain compiler package.

- [ ] **Step 2: Write failing tree tests for shared content**

```ts
it("builds stable section, item, field, and rich-text ancestry", () => {
	const tree = buildSemanticTree({
		data: sampleResumeData,
		template: "onyx",
		page: sampleResumeData.metadata.layout.pages[0]!,
		pageNumber: 1,
		showHeader: true,
	});

	expect(getNode(tree, "page-1/region-main/section-experience")?.attributes.type).toBe("experience");
	expect(findNodes(tree, { kind: "field", name: "company" })[0]?.roles).toContain("primary-text");
	expect(findNodes(tree, { kind: "list-marker" }).length).toBeGreaterThan(0);
});

it("represents nested experience roles as semantic item children", () => {
	const role = findNodeById(buildFixtureTree(), "experience-role-id");
	expect(role?.kind).toBe("item");
	expect(role?.roles).toContain("experience-role");
});

it("maps every semantic node to an existing primitive or an explicit alias", () => {
	const inventory = createBindingInventory(buildFixtureTree());

	expect(inventory.unboundNodeKeys).toEqual([]);
	expect(inventory.syntheticWrapperCount).toBe(0);
});
```

- [ ] **Step 3: Verify RED**

Run: `pnpm --filter @reactive-resume/pdf test -- src/semantic/tree.test.ts`

Expected: FAIL on the tree-builder sentinel or the first ancestry/binding assertion, not on module resolution.

- [ ] **Step 4: Implement shared tree construction with no React imports**

Build:

```text
resume
  page[page-number]
    region
      header → picture/name/headline/contact-list/contact-item
      section[id][type][placement][origin]
        section-heading
        section-items
          item[id]
            item-header
            field[name][role]
            link/icon/level
            rich-text
              rich-heading[level]
              blockquote
              paragraph
              list
                list-item
                  list-marker
                  list-item-content
              link/strong/emphasis/underline/strike/code/text-span/mark/hard-break/horizontal-rule
```

Use one stable path key per semantic node. Normalize rich-text HTML into a semantic subtree using the same normalization
input as `react-pdf-html`; custom rich-text renderers bind those keys to existing paragraph/list/item/marker/content/link/
strong/mark output. Do not add renderer wrappers.

Before accepting a node or template part, add it to `binding-inventory.ts` with one of two bindings:

1. `primitive`: exactly one existing React PDF primitive receives the node key;
2. `alias`: the selector identity is reflected as a `part~=`/role token on an existing canonical node.

Aliases do not create parent/child nodes and cannot receive independent structural ordering. Remove a proposed target if
neither binding is truthful. In particular, Bronzor's interleaved row is an alias on the existing section primitive, not
a synthetic `template-part` child.

- [ ] **Step 5: Verify all built-in/custom section field names**

The tests must cover:

```text
profiles: network, username
experience: company, position, location, period, description, nested roles
education: school, area, degree, grade, location, period, description
projects: name, period, description
skills: name, proficiency, keywords
languages: language, fluency
interests: name, keywords
awards: title, date, awarder, description
certifications: title, date, issuer, description
publications: title, date, publisher, description
volunteer: organization, location, period, description
references: name, position, phone, description
summary and cover-letter: rich text
```

Also cover:

- empty/conditional email, phone, location, website, and custom contact fields;
- structured item websites and inline website links;
- section-heading icons, item icons, level containers, active/inactive level decorations;
- rich heading levels, blockquote, paragraph/list/list-item/marker/content, link, strong, emphasis, underline, strike,
  inline code, colored text spans, mark/highlight, hard break, and horizontal-rule nodes;
- cover-letter recipient and content;
- hidden sections/items and entries removed by existing filtering;
- custom sections of every supported type;
- one section referenced on different authored pages without node-key collision.

Run:

```bash
pnpm --filter @reactive-resume/pdf test -- src/semantic/tree.test.ts src/semantic/field-registry.test.ts src/semantic/binding-inventory.test.ts
pnpm --filter @reactive-resume/pdf typecheck
```

Expected: PASS with deterministic node keys across repeated builds.

- [ ] **Step 6: Commit**

```bash
git add packages/pdf pnpm-lock.yaml
git commit -m "feat(pdf): build shared semantic resume tree"
```

---

### Task 9: Register All Template Regions and Parts

**Files:**
- Create: `packages/pdf/src/semantic/template-manifest.ts`
- Create: `packages/pdf/src/semantic/template-manifest.test.ts`
- Create: `packages/pdf/src/templates/azurill/semantic.ts`
- Create: `packages/pdf/src/templates/bronzor/semantic.ts`
- Create: `packages/pdf/src/templates/chikorita/semantic.ts`
- Create: `packages/pdf/src/templates/ditgar/semantic.ts`
- Create: `packages/pdf/src/templates/ditto/semantic.ts`
- Create: `packages/pdf/src/templates/gengar/semantic.ts`
- Create: `packages/pdf/src/templates/glalie/semantic.ts`
- Create: `packages/pdf/src/templates/kakuna/semantic.ts`
- Create: `packages/pdf/src/templates/lapras/semantic.ts`
- Create: `packages/pdf/src/templates/leafish/semantic.ts`
- Create: `packages/pdf/src/templates/meowth/semantic.ts`
- Create: `packages/pdf/src/templates/onyx/semantic.ts`
- Create: `packages/pdf/src/templates/pikachu/semantic.ts`
- Create: `packages/pdf/src/templates/rhyhorn/semantic.ts`
- Create: `packages/pdf/src/templates/scizor/semantic.ts`
- Modify: `packages/pdf/src/templates/index.ts`
- Modify: `packages/pdf/src/semantic/tree.ts`

**Interfaces:**
- Produces: `TemplateSemanticManifest`, `getTemplateSemanticManifest`, registry fingerprint input.
- Consumed by: tree builder, editor completion/docs, adapter coverage.

- [ ] **Step 1: Write failing exhaustiveness and placement tests**

```ts
it.each(templateSchema.options)("%s publishes a semantic manifest", (template) => {
	expect(getTemplateSemanticManifest(template)).toBeDefined();
});

it.each(["bronzor", "scizor"] as const)("%s preserves layout origin separately from physical placement", (template) => {
	const tree = buildTemplateFixtureTree(template);
	const sidebarOrigin = findNodes(tree, { kind: "section", origin: "sidebar" });

	expect(sidebarOrigin.length).toBeGreaterThan(0);
	expect(sidebarOrigin.every((node) => node.attributes.placement === "main")).toBe(true);
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @reactive-resume/pdf test -- src/semantic/template-manifest.test.ts`

Expected: FAIL on the manifest sentinel or the first template exhaustiveness assertion, not on module resolution.

- [ ] **Step 3: Implement the manifest contract and all 15 files**

Each manifest declares regions, header placement, special summary placement, and template parts. At minimum register:

```text
azurill: timeline-line, timeline-dot, timeline-marker, timeline-content
bronzor: interleaved-section-row alias on the existing section node
ditgar: featured-summary, sidebar-background, item-header-border
ditto: header-band, picture-anchor, contact-offset
gengar: featured-summary, sidebar-background
glalie: sidebar-background
leafish: header-intro, header-body, header-contact-band
meowth: inline-item-header-leading, inline-item-header-middle, inline-item-header-trailing
pikachu: header-divider
rhyhorn: contact-item-content, contact-item-last
scizor: header-name-rule
```

Chikorita, Kakuna, Lapras, Onyx, and other templates still publish explicit region/header manifests even when they have
no unique template parts. Bronzor and Scizor record original layout `origin` separately from physical `placement`.
Manifest validation fails when a registered part lacks a primitive/alias binding or when an existing template chrome
binding has no stable registered part.

- [ ] **Step 4: Verify manifests, tree fingerprint stability, and all-template smoke construction**

Run:

```bash
pnpm --filter @reactive-resume/pdf test -- src/semantic/template-manifest.test.ts src/templates/index.test.ts
pnpm --filter @reactive-resume/pdf typecheck
```

Expected: PASS for every template and every registered part owner.

- [ ] **Step 5: Commit**

```bash
git add packages/pdf
git commit -m "feat(pdf): register semantic template manifests"
```

---

### Task 10: Add the PDF Adapter, Mode Switch, and No-Wrapper Bindings

**Files:**
- Create: `packages/pdf/src/semantic/base-styles.ts`
- Create: `packages/pdf/src/semantic/adapter.ts`
- Create: `packages/pdf/src/semantic/context.tsx`
- Create: `packages/pdf/src/semantic/resolve.ts`
- Create: `packages/pdf/src/semantic/adapter.test.ts`
- Create: `packages/pdf/src/semantic/no-wrapper.test.tsx`
- Create: `packages/pdf/src/semantic/rich-text-bindings.test.tsx`
- Create: `packages/pdf/src/semantic/pagination.test.tsx`
- Create: `packages/pdf/src/semantic/issue-fixtures.test.tsx`
- Modify: `packages/pdf/src/document.tsx`
- Modify: `packages/pdf/src/templates/shared/context.tsx`
- Modify: `packages/pdf/src/templates/shared/primitives.tsx`
- Modify: `packages/pdf/src/templates/shared/sections.tsx`
- Modify: `packages/pdf/src/templates/shared/rich-text.tsx`
- Modify: `packages/pdf/src/templates/shared/contact-item.tsx`
- Modify: `packages/pdf/src/templates/shared/level-display.tsx`
- Modify: all 15 `*Page.tsx` template files

**Interfaces:**
- Produces: `resolveResumePresentation`, `SemanticRenderProvider`, `useResolvedNode`,
  `ResolvedPdfNodePresentation`.
- Consumes: compiler result, descriptor tree, template base styles.

- [ ] **Step 1: Write failing adapter and issue regression tests**

```ts
it("lets semantic field font weight override template bold defaults", () => {
	const presentation = resolveIssueFixture("#3146", `
		@version 1;
		section[type="experience"] field[name="company"] { font-weight: 400; }
	`);

	expect(presentation["experience/company"]?.style.fontWeight).toBe("400");
});

it("lets semantic link decoration override the builder underline base", () => {
	const presentation = resolveIssueFixture("#3134", `
		@version 1;
		link { text-decoration: none; }
	`);

	expect(presentation["header/contact-email/link"]?.style.textDecoration).toBe("none");
});

it("styles Basics/header nodes while rejecting unsupported gradients", () => {
	const valid = resolveIssueFixture("#3137", `
		@version 1;
		header { background-color: #1e293b; }
		name { color: white; }
	`);
	const invalid = compileStylesheet({
		languageVersion: 1,
		text: "@version 1; header { background-image: linear-gradient(red, blue); }",
	});

	expect(valid["header"]?.style.backgroundColor).toBe("#1e293b");
	expect(invalid.program).toBeNull();
});

it("unbolds only skill names and leaves experience titles unchanged", () => {
	const presentation = resolveIssueFixture("#2223", `
		@version 1;
		section[type="skills"] field[name="name"] { font-weight: 400; }
	`);

	expect(presentation["skills/item-1/name"]?.style.fontWeight).toBe("400");
	expect(presentation["experience/item-1/company"]?.style.fontWeight).not.toBe("400");
});

it("never applies legacy and semantic custom styles together", () => {
	expect(resolveMode(semanticResumeData)).toBe("semantic");
	expect(resolveMode(legacyResumeData)).toBe("legacy");
});

it("uses authored page context for wrapped physical subpages and repeats fixed nodes", async () => {
	const result = await renderPaginationFixture(`
		@version 1;
		page[page-number="1"] { size: A4; }
		header { -resume-fixed: true; }
		@media (max-width: 600pt) { section-heading { font-size: 9pt; } }
	`);

	expect(result.physicalPages).toBeGreaterThan(1);
	expect(result.fixedHeaderCount).toBe(result.physicalPages);
	expect(result.headingFontSizes).toEqual(expect.arrayContaining([9]));
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm --filter @reactive-resume/pdf test -- src/semantic/adapter.test.ts src/semantic/issue-fixtures.test.tsx
```

Expected: FAIL on the adapter sentinel or the first final-style/mode assertion, not on module resolution.

- [ ] **Step 3: Implement presentation resolution before React rendering**

```ts
export type ResolvedPdfNodePresentation = {
	style?: Style;
	size?: number | string;
	break?: true;
	wrap?: false;
	fixed?: boolean;
	minPresenceAhead?: number;
	orphans?: number;
	widows?: number;
};

export function resolveResumePresentation(input: {
	data: ResumeData;
	template: Template;
	applied?: StylesheetSource;
	mode: StylesheetMode;
}): ResolvedResumePresentation;
```

Builder/template defaults become the base map. Semantic values compose after that map. Crash-prevention values remain
last only when documented. Structural filtering and ordering happen on descriptors before templates map children.

Section, item, field, contact, and template renderers iterate the resolved descriptor children rather than independently
mapping raw resume arrays. Each descriptor carries a render binding to the existing primitive/render function. Hidden
descriptors are absent; ordered descriptors determine invocation order. When one legacy `Text` primitive combines
multiple fields, split it into keyed field primitives only with a before/after PDF raster parity fixture proving the
default output did not change.

For rich text, extend the existing custom `react-pdf-html` renderers/stylesheet so normalized heading, blockquote,
paragraph, list, list-item, marker, content, link, strong, emphasis, underline, strike, inline-code, text-span, mark,
hard-break, and horizontal-rule nodes receive deterministic keys and resolved styles. The descriptor builder and
renderers consume the same normalized HTML; neither may infer a different tree.

- [ ] **Step 4: Bind existing nodes without wrappers**

Add `nodeKey` props to shared primitives and template layout nodes. `useResolvedNode(nodeKey)` returns style and primitive
props. Do not wrap a primitive merely to create a semantic target. Preserve legacy hooks while `mode !== "semantic"`.

The no-wrapper test mocks React PDF primitives, renders each template with an empty semantic stylesheet, and compares
primitive type/count/order against legacy mode. Layout `Page`/`View` counts must match; intentionally split text fields
require approved raster parity and an explicit binding-inventory entry.

- [ ] **Step 5: Verify shared behavior and all 15 render smokes**

Run:

```bash
pnpm --filter @reactive-resume/pdf test -- src/semantic src/templates/shared src/templates/index.test.ts
pnpm --filter @reactive-resume/pdf typecheck
```

Expected: PASS for #3146, #3134, #3137, #2223, rich-text bindings, authored/physical-page behavior, fixed nodes,
page-size/media phases, no-layout-wrapper parity, browser/server final primitive-prop identity, and all templates.

- [ ] **Step 6: Commit**

```bash
git add packages/pdf
git commit -m "feat(pdf): resolve semantic stylesheet presentation"
```

---

### Task 11: Add Terminable Browser and Server PDF Preflight Workers

**Files:**
- Create: `packages/pdf/src/semantic/preflight-core.tsx`
- Create: `packages/pdf/src/semantic/preflight-core.test.tsx`
- Create: `apps/server/src/workers/stylesheet-preflight.ts`
- Create: `apps/server/src/services/stylesheet-preflight.ts`
- Create: `apps/server/src/services/stylesheet-preflight.test.ts`
- Modify: `apps/server/tsdown.config.ts`
- Modify: `apps/server/package.json`
- Modify: `packages/api/src/context.ts`
- Modify: `apps/server/src/rpc/handler.ts`
- Modify: `packages/pdf/src/browser.tsx`
- Modify: `packages/pdf/src/server.tsx`
- Modify: `packages/pdf/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `renderPreflightPdf`, server `StylesheetPreflightRunner`, `PdfPreflightResult`.
- Consumed by: API mutation and the browser preflight worker added in Task 15.

- [ ] **Step 1: Add the direct server PDF parser dependency**

Run: `pnpm --filter server add "@reactive-resume/pdf@workspace:*" pdfjs-dist@latest`

Expected: server package and lockfile directly declare the PDF workspace package and parser used inside the worker.

- [ ] **Step 2: Write failing real-worker preflight tests**

```ts
it("accepts a bounded candidate render in an isolated worker", async () => {
	const result = await preflightRunner.run({
		data: defaultResumeData,
		template: defaultResumeData.metadata.template,
		stylesheet: validStylesheet,
		limits: { timeoutMs: 5_000, maxPages: 20, maxBytes: 10_000_000, maxOldGenerationMb: 256 },
	});

	expect(result).toEqual(expect.objectContaining({ ok: true, pageCount: 1 }));
});

it("terminates a real worker when the render exceeds its deadline", async () => {
	const result = await preflightRunner.run({
		data: veryLargeResumeData,
		template: "onyx",
		stylesheet: validStylesheet,
		limits: { timeoutMs: 1, maxPages: 20, maxBytes: 10_000_000, maxOldGenerationMb: 64 },
	});

	expect(result).toEqual(expect.objectContaining({ ok: false, code: "STYLESHEET_PREFLIGHT_TIMEOUT" }));
	expect(preflightRunner.activeWorkerCount).toBe(0);
});
```

- [ ] **Step 3: Verify RED**

Run:

```bash
pnpm --filter @reactive-resume/pdf test -- src/semantic/preflight-core.test.tsx
pnpm --filter server test -- src/services/stylesheet-preflight.test.ts
```

Expected: FAIL on the preflight sentinel or real-worker termination assertion, not on module resolution.

- [ ] **Step 4: Implement a worker-safe render core**

`renderPreflightPdf` compiles/resolves the candidate and returns PDF bytes. It performs no timers or DB operations.
The server worker imports it, parses the generated bytes with `pdfjs-dist` to obtain `numPages`, checks byte/page limits,
and posts a plain result.

Use immutable server-owned production limits; clients cannot raise them:

```ts
export const STYLESHEET_PREFLIGHT_LIMITS = {
	timeoutMs: 5_000,
	maxPages: 20,
	maxBytes: 10_000_000,
	maxPageWidthPt: 2_000,
	maxPageHeightPt: 20_000,
	maxPageAreaPt2: 20_000_000,
	maxOldGenerationMb: 256,
} as const;
```

Resolve authored page sizes and reject width, height, or area violations before starting React PDF rendering. Tests may
inject stricter limits through an internal runner constructor; API input never contains limits.

- [ ] **Step 5: Build and terminate the Node worker explicitly**

Add `stylesheet-preflight-worker` as a second `tsdown` entry. In production, start the emitted `.mjs` worker; in source
development/tests, use the TS entry with the inherited `tsx` loader. Set worker-thread `resourceLimits`, terminate on
timeout, and remove listeners in every exit path. A timeout must stop CPU work rather than merely reject a
`Promise.race`.

```ts
export type StylesheetPreflightRunner = {
	run(input: StylesheetPreflightInput): Promise<PdfPreflightResult>;
};
```

Inject the runner into API request context from `apps/server/src/rpc/handler.ts`; keep it optional in non-mutation
in-process contexts. The stylesheet mutation returns a controlled unavailable error if no runner is configured.

- [ ] **Step 6: Define the browser-worker contract for Task 15**

The browser uses a separate terminable Vite worker that imports `renderPreflightPdf` plus PDF.js, returns a transferable
`ArrayBuffer` and page count, and is terminated/recreated on timeout. Do not claim memory isolation on the main thread.

- [ ] **Step 7: Verify real isolation, build entries, and focused PDF behavior**

Run:

```bash
pnpm --filter @reactive-resume/pdf test -- src/semantic/preflight-core.test.tsx src/browser.test.tsx src/server.test.tsx
pnpm --filter server test -- src/services/stylesheet-preflight.test.ts
pnpm --filter server build
pnpm --filter @reactive-resume/pdf typecheck
```

Expected: PASS; built output includes `stylesheet-preflight-worker.mjs`, timeouts leave no active worker, and page/byte/
memory limits return deterministic diagnostic codes.

- [ ] **Step 8: Commit**

```bash
git add packages/pdf packages/api apps/server pnpm-lock.yaml
git commit -m "feat(server): isolate stylesheet PDF preflight"
```

---

### Task 12: Add Behavioral Legacy Conversion and Activation Parity

**Files:**
- Create: `packages/pdf/src/semantic/legacy-converter.ts`
- Create: `packages/pdf/src/semantic/legacy-converter.test.ts`
- Create: `packages/pdf/src/semantic/legacy-parity.ts`
- Create: `packages/pdf/src/semantic/legacy-parity.test.ts`
- Create: `packages/pdf/src/semantic/legacy-render-parity.test.tsx`
- Create: `packages/pdf/src/semantic/test/rasterize-pdf.ts`
- Create: `packages/pdf/src/semantic/__fixtures__/legacy/*.json`
- Modify: `packages/pdf/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `convertLegacyStyleRules`, `compareLegacySemanticPresentation`.
- Consumes: existing legacy schema/PDF resolvers, serializer, semantic adapter.

- [ ] **Step 1: Add test-only raster dependencies**

Run:

```bash
pnpm --filter @reactive-resume/pdf add -D pdfjs-dist@latest @napi-rs/canvas@latest pixelmatch@latest pngjs@latest @types/pngjs@latest
```

Expected: PDF package and lockfile directly declare the test-only raster stack.

- [ ] **Step 2: Write failing golden and parity tests**

```ts
it("converts scope, slots, units, labels, and disabled rules deterministically", () => {
	const result = convertLegacyStyleRules(legacyFixtureResume);

	expect(result.source.languageVersion).toBe(1);
	expect(result.source.text).toMatchFileSnapshot("./__fixtures__/legacy/mixed-rules.expected.css");
});

it("matches final primitive props and rendered pixels at activation", async () => {
	const conversion = convertLegacyStyleRules(legacyFixtureResume);
	const comparison = await compareLegacySemanticRender({
		data: legacyFixtureResume,
		convertedSource: conversion.source,
	});

	expect(comparison.primitivePropMismatches).toEqual([]);
	expect(comparison.pixelDiffRatio).toBe(0);
	expect(comparison.mismatches).toEqual([]);
});
```

- [ ] **Step 3: Verify RED**

Run:

```bash
pnpm --filter @reactive-resume/pdf test -- src/semantic/legacy-converter.test.ts src/semantic/legacy-parity.test.ts src/semantic/legacy-render-parity.test.tsx
```

Expected: FAIL on the converter sentinel or golden/render-parity assertion, not on module resolution.

- [ ] **Step 4: Implement behavioral conversion**

Sanitize with `styleRulesSchema`, then evaluate effective legacy output including:

- global → section type → section ID property merging and same-specificity array order;
- schema/PDF numeric clamps and color conversion;
- `Bold` after-rule precedence (#3146);
- final link underline preference (#3134);
- icon and level `fontSize` to explicit icon size;
- rich-text paragraph/list/link/bold/mark paths;
- award `bold={false}` and template feature exceptions.

Emit `@version 1;`, safe comments, quoted UUID selectors, explicit point units, and commented disabled/no-effect blocks.
Never emit `@resume-disabled`. Compare final mocked primitive props after every existing inline/template/safety layer, then
render and raster-compare the legacy and semantic PDFs for the migration fixtures. Presentation-map equality alone does
not satisfy activation parity.

- [ ] **Step 5: Add mandatory fixtures**

```text
merge-specificity
array-order-tie
disabled-rules
sanitized-intent-3199
clamped-spacing
link-underline-3134
rich-text-all-slots
icon-level-size
award-unbold
primary-text-bold-3146
custom-section-type
section-id-uuid
all-templates-smoke
```

- [ ] **Step 6: Verify converter, parity, and existing legacy tests**

Run:

```bash
pnpm --filter @reactive-resume/pdf test -- src/semantic/legacy-converter.test.ts src/semantic/legacy-parity.test.ts src/semantic/legacy-render-parity.test.tsx src/templates/shared/style-rules.test.ts
pnpm --filter @reactive-resume/schema test -- src/resume/data.test.ts src/resume/style-rules.test.ts
```

Expected: PASS; parity is guaranteed for current data/template/base settings at activation, not after later template
changes.

- [ ] **Step 7: Commit**

```bash
git add packages/pdf pnpm-lock.yaml
git commit -m "feat(pdf): convert legacy styles to Semantic CSS"
```

---

### Task 13: Add the Revisioned Stylesheet API State Machine

**Files:**
- Create: `packages/api/src/features/resume/stylesheet.ts`
- Create: `packages/api/src/features/resume/stylesheet-service.ts`
- Create: `packages/api/src/features/resume/stylesheet-preflight.ts`
- Create: `packages/api/src/features/resume/stylesheet-observability.ts`
- Create: `packages/api/src/features/resume/stylesheet-observability.test.ts`
- Create: `packages/api/src/features/resume/stylesheet-service.test.ts`
- Create: `packages/api/src/features/resume/stylesheet-service.integration.test.ts`
- Modify: `packages/api/src/features/resume/router.ts`
- Modify: `packages/api/src/dto/resume.ts`
- Modify: `packages/api/src/features/resume/crud.ts`
- Modify: `packages/api/src/features/resume/versions.ts`
- Modify: `packages/api/src/features/resume/events.ts`
- Modify: `packages/api/src/features/resume/events.test.ts`

**Interfaces:**
- Produces: `resume.stylesheet.getState`, `resume.stylesheet.mutate`; state transitions
  `edit_source | activate | deactivate | restore_history`.
- Consumes: persistence columns, compiler, parity, preflight.

- [ ] **Step 1: Write failing state-machine tests**

```ts
const commonMutationInput = {
	id: "resume-1",
	expectedRevision: 3,
	expectedRenderDataVersion: 8,
	editGeneration: 1,
} as const;

it("stores invalid source while preserving applied source", async () => {
	const result = await mutateStylesheet({
		...commonMutationInput,
		transition: "edit_source",
		source: invalidSource,
	});

	expect(result.stylesheet.source).toEqual(invalidSource);
	expect(result.stylesheet.applied).toEqual(previousApplied);
	expect(result.revision).toBe(4);
	expect(result.renderDataVersion).toBe(8);
});

it("preflights outside the transaction then compares both versions", async () => {
	await mutateStylesheet({ ...commonMutationInput, transition: "edit_source", source: validSource });

	expect(callOrder).toEqual(["readSnapshot", "compile", "preflight", "begin", "lock", "compare", "update", "commit"]);
});

it("requires explicit parity-checked activation", async () => {
	const result = await mutateStylesheet({ ...commonMutationInput, transition: "activate", source: validSource });

	expect(result.stylesheet.mode).toBe("semantic");
	expect(parityCheck).toHaveBeenCalledOnce();
	expect(result.revision).toBe(4);
	expect(result.renderDataVersion).toBe(8);
});

it("deactivates to legacy without deleting either Semantic CSS source", async () => {
	const result = await mutateStylesheet({ ...commonMutationInput, transition: "deactivate" });

	expect(result.stylesheet.mode).toBe("legacy");
	expect(result.stylesheet.source).toEqual(previousSource);
	expect(result.stylesheet.applied).toEqual(previousApplied);
	expect(result.revision).toBe(4);
	expect(result.renderDataVersion).toBe(8);
});

it("preserves all other rules and last-valid applied source after a syntax error and reload", async () => {
	await mutateStylesheet({ ...commonMutationInput, transition: "edit_source", source: invalidSyntaxFixture });
	const reloaded = await getStylesheetState("resume-1");

	expect(reloaded.stylesheet.source).toEqual(invalidSyntaxFixture);
	expect(reloaded.stylesheet.applied).toEqual(previousApplied);
	expect(reloadedLegacyRules).toEqual(previousLegacyRules);
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @reactive-resume/api test -- src/features/resume/stylesheet-service.test.ts`

Expected: FAIL on the state-machine sentinel or source/applied/CAS assertion, not on module resolution.

- [ ] **Step 3: Implement strongly typed DTO and transition rules**

```ts
type StylesheetMutationCommon = {
	id: string;
	expectedRevision: number;
	expectedRenderDataVersion: number;
	editGeneration: number;
};

type MutateResumeStylesheetInput = StylesheetMutationCommon &
	(
		| { transition: "edit_source"; source: StylesheetSource }
		| { transition: "activate"; source: StylesheetSource }
		| { transition: "deactivate" }
		| {
				transition: "restore_history";
				restore: {
					mode: StylesheetMode;
					source: StylesheetSource;
					applied: StylesheetSource;
				};
		  }
	);
```

Implement the same discriminated union in Zod so extra/missing fields fail at the route boundary. All test inputs include
`editGeneration`, both expected versions, and only the payload allowed by their transition.

Normal edits ignore client `applied`. Activation runs compiler, parity, and preflight. Deactivation changes only mode to
legacy and retains both Semantic CSS sources for reactivation/rollback. Restore independently validates and preflights historical
applied source. Import validates imported applied; duplicate copies content with revision zero; version restore restores
content but increments current revision.

Every stylesheet transition increments and acknowledges `stylesheetRevision` only. It returns the current
`renderDataVersion` unchanged; content/base-setting mutations own that column. A preflight CAS compares both so a content
change still invalidates the snapshot.

- [ ] **Step 4: Implement snapshot/preflight/short-CAS flow**

Read immutable data/revisions, compile and preflight outside a transaction, then short-lock and compare both
`stylesheetRevision` and `renderDataVersion`. Return typed 409 conflicts with canonical state. Publish SSE mutation
`"stylesheet"` after commit.

Add a real PostgreSQL integration test that runs two concurrent mutations against one resume, pauses the first between
preflight and CAS, changes render data through the second connection, then proves the first receives a conflict and
neither update is lost. Do not rely only on mocked call order.

Add structured events for `semantic_css.compile`, `semantic_css.preflight`, `semantic_css.convert_legacy`,
`semantic_css.parity_check`, and `semantic_css.activate`. Include duration, language version, source byte count, template,
diagnostic codes, page count, revision, and success/failure; hash resume IDs and never log source, comments, resume
content, or personal fields. Tests spy on logging and assert sensitive text is absent.

- [ ] **Step 5: Verify lifecycle and conflict cases**

Run:

```bash
pnpm --filter @reactive-resume/api test -- src/features/resume/stylesheet-service.test.ts src/features/resume/stylesheet-observability.test.ts src/features/resume/service.test.ts src/features/resume/events.test.ts
dotenvx run -f .env.local -- pnpm --filter @reactive-resume/api test -- src/features/resume/stylesheet-service.integration.test.ts
pnpm --filter @reactive-resume/api typecheck
```

Expected: PASS for real concurrent CAS, stale revisions, content changes during preflight, locked resumes, invalid
source/reload (#3199), render failure, activation, deactivation, restore, import, duplicate, version restore, and forged
applied values.

- [ ] **Step 6: Commit**

```bash
git add packages/api
git commit -m "feat(api): add semantic stylesheet state machine"
```

---

### Task 14: Add Public Projection, Redaction, and PDF Fallback

**Files:**
- Create: `packages/pdf/src/semantic/public-projection.ts`
- Create: `packages/pdf/src/semantic/public-projection.test.ts`
- Create: `packages/api/src/features/resume/public-style-projection.ts`
- Create: `packages/api/src/features/resume/public-style-projection.test.ts`
- Create: `packages/api/src/features/resume/public-pdf.ts`
- Create: `packages/api/src/features/resume/public-pdf.test.ts`
- Create: `packages/api/src/features/resume/public-render-rate-limit.ts`
- Create: `packages/api/src/features/resume/public-render-rate-limit.test.ts`
- Modify: `packages/api/src/features/resume/access-policy.ts`
- Modify: `packages/api/src/features/resume/access-policy.test.ts`
- Modify: `packages/api/src/features/resume/sharing.ts`
- Modify: `packages/api/src/features/resume/router.ts`
- Modify: `packages/api/src/dto/resume.ts`
- Modify: `packages/api/package.json`
- Modify: `packages/pdf/package.json`
- Create: `apps/server/src/http/public-resume-pdf.ts`
- Create: `apps/server/src/http/public-resume-pdf.test.ts`
- Modify: `apps/server/src/http/app.ts`
- Modify: `apps/server/src/http/app.test.ts`

**Interfaces:**
- Produces: `resume.getStyleProjection` public oRPC query and authorized server-rendered fallback service.
- Consumes: resolved presentation, canonical render hash, public access/password policy.

- [ ] **Step 1: Write failing public-data tests**

```ts
it("never returns editable or applied stylesheet source to non-owners", () => {
	const result = redactResumeForViewer(ownerResumeWithStylesheet, false);

	expect(result.data.metadata.stylesheet).toBeUndefined();
});

it("rejects a projection whose resolved nodes do not match the render hash", async () => {
	const valid = await createPublicStyleProjection(publicRenderInput);
	const tampered = { ...valid, nodes: { ...valid.nodes, name: { style: { color: "red" } } } };

	await expect(validatePublicStyleProjection(publicRenderInput.data, tampered)).resolves.toBe(false);
});

it("returns a projection through the public route without stylesheet sources", async () => {
	const result = await getStyleProjection({ username: "jane", slug: "resume", requestHeaders });

	expect(result).toEqual(expect.objectContaining({ formatVersion: 1, nodes: expect.any(Object) }));
	expect(JSON.stringify(result)).not.toContain("@version");
});

it("shares an IP-and-resume render budget across projection and PDF fallback", async () => {
	await exhaustPublicRenderBudget({ ip: "203.0.113.7", resumeId: "resume-1" });

	await expect(getStyleProjection(publicInput)).rejects.toMatchObject({ code: "RATE_LIMIT_EXCEEDED" });
	await expect(createPublicResumePdf(publicInput)).rejects.toMatchObject({ code: "RATE_LIMIT_EXCEEDED" });
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm --filter @reactive-resume/pdf test -- src/semantic/public-projection.test.ts
pnpm --filter @reactive-resume/api test -- src/features/resume/public-style-projection.test.ts src/features/resume/public-pdf.test.ts src/features/resume/public-render-rate-limit.test.ts src/features/resume/access-policy.test.ts
```

Expected: FAIL on projection/redaction/rate-limit assertions after typed shells compile.

- [ ] **Step 3: Implement fully resolved projection and hash**

Projection includes format/language/tree versions, registry/adapter fingerprints, domain-separated render hash, and
resolved nodes keyed by stable node key. Resolve variables and selectors before serialization. Public clients verify all
versions/fingerprints/hash and never receive source locations, comments, diagnostics, selectors, or variables.

Mount `getStyleProjection` in `sharing.ts` and `resumeRouter` as a concrete
`GET /resumes/{username}/{slug}/style-projection` procedure. Reuse `getBySlug` visibility/password checks and rate
rules, then add a dedicated shared IP+resume token bucket because `getBySlug` itself has no expensive-render limiter.
Projection generation and public PDF fallback consume that budget; ordinary resume JSON reads do not. Add the output
schema to `dto/resume.ts`, cache by `renderDataHash`, add intentional PDF exports for semantic tree/projection/preflight,
and add API export `./features/resume/public-pdf`; no app imports private workspace source paths.

- [ ] **Step 4: Extend fallback without weakening authorization**

Add a distinct public/password-aware fallback handler and route beside the existing signed owner-download flow. The
server handler imports only `@reactive-resume/api/features/resume/public-pdf`; that exported service reuses access policy
and rate-limit behavior. Keep `Cache-Control` correct for public/password/private data and leave `resume-pdf.ts`
signed-token behavior unchanged. Emit `semantic_css.render_fallback` with mismatch reason, fingerprints, and duration,
but no resume data or stylesheet source.

- [ ] **Step 5: Verify projection, redaction, password, rate-limit, and fallback tests**

Run:

```bash
pnpm --filter @reactive-resume/pdf test -- src/semantic/public-projection.test.ts
pnpm --filter @reactive-resume/api test -- src/features/resume/public-style-projection.test.ts src/features/resume/public-pdf.test.ts src/features/resume/public-render-rate-limit.test.ts src/features/resume/access-policy.test.ts
pnpm --filter server test -- src/http/public-resume-pdf.test.ts src/http/resume-pdf.test.ts src/http/app.test.ts
```

Expected: PASS; projection mismatch refetches/falls back and never bypasses public/password checks.

- [ ] **Step 6: Commit**

```bash
git add packages/pdf packages/api apps/server
git commit -m "feat: add public semantic style projection"
```

---

### Task 15: Add the Web Stylesheet Store, Worker, and Mutation Queue

**Files:**
- Create: `apps/web/src/features/resume/stylesheet/protocol.ts`
- Create: `apps/web/src/features/resume/stylesheet/stylesheet.worker.ts`
- Create: `apps/web/src/features/resume/stylesheet/preflight.worker.ts`
- Create: `apps/web/src/features/resume/stylesheet/worker-client.ts`
- Create: `apps/web/src/features/resume/stylesheet/store.ts`
- Create: `apps/web/src/features/resume/stylesheet/store.test.ts`
- Create: `apps/web/src/features/resume/stylesheet/worker-client.test.ts`
- Modify: `apps/web/src/routes/builder/$resumeId/route.tsx`
- Modify: `apps/web/src/features/resume/builder/draft.ts`

**Interfaces:**
- Produces: `useStylesheetStore`, `initializeStylesheetStore`, serialized compile/save runtime.
- Consumes: API mutation state, compiler, immutable semantic tree snapshot.

- [ ] **Step 1: Write failing queue/generation/history tests**

```ts
it("advances stylesheet revision while retaining the acknowledged resume render-data version", async () => {
	store.setSourceText("generation two");
	await acknowledge({ generation: 1, revision: 4, renderDataVersion: 8, source: "generation one" });

	expect(store.getState().revision).toBe(4);
	expect(store.getState().renderDataVersion).toBe(8);
	expect(store.getState().source.text).toBe("generation two");
	expect(nextMutation.expectedRevision).toBe(4);
	expect(nextMutation.expectedRenderDataVersion).toBe(8);
});

it("rebases a conflict without dropping unsaved source", async () => {
	store.setSourceText("local unsaved source");
	await conflict({ revision: 8, stylesheet: remoteStylesheet });

	expect(store.getState().source.text).toBe("local unsaved source");
	expect(store.getState().revision).toBe(8);
});

it("restarts a timed-out preflight worker and keeps last-valid applied source", async () => {
	await preflightTimeout();

	expect(terminatedWorker.terminate).toHaveBeenCalledOnce();
	expect(replacementWorker).toBeDefined();
	expect(store.getState().applied).toEqual(previousApplied);
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm --filter web test -- src/features/resume/stylesheet/store.test.ts src/features/resume/stylesheet/worker-client.test.ts
```

Expected: FAIL on the store/worker sentinel or queue/generation assertion, not on module resolution.

- [ ] **Step 3: Implement structured-clone-safe worker protocol**

Compiler requests carry request ID, source, language version, edit generation, semantic tree, base settings, and page
contexts. Responses carry plain program/diagnostic/resolved values only; never clone CSSTree nodes or class instances.
Discard out-of-order results by request ID.

The separate preflight worker imports the PDF browser preflight core and PDF.js, returns a transferable PDF
`ArrayBuffer`, page count, and byte count, and is terminated/recreated when its deadline expires. Tests assert the worker
instance terminates rather than leaving background rendering alive.

- [ ] **Step 4: Implement one-in-flight/one-replaceable-pending mutation runtime**

Always persist raw source through `edit_source`, including compiler errors. Only local/server preflight success changes
applied. Consume every acknowledgement revision; gate visible state by generation. Keep stylesheet undo/redo snapshots
separate from whole-resume history and use `restore_history`.

Stylesheet acknowledgements advance `revision` and copy the current server `renderDataVersion`; they never increment the
render-data version themselves. Resume update/SSE responses that change content replace `renderDataVersion` and force a
queued stylesheet candidate to preflight/retry against the new snapshot.

- [ ] **Step 5: Initialize and clean up per resume**

Builder route initializes from owner stylesheet state and cleans up workers, timers, requests, and store data on unmount
or resume switch. Subscribe to `"stylesheet"` SSE mutations so cross-tab changes refetch canonical stylesheet state while
preserving a focused local draft. Add `.cm-editor` to editable-focus detection so global resume undo does not intercept
editor keys.

- [ ] **Step 6: Verify store, worker, and existing draft behavior**

Run:

```bash
pnpm --filter web test -- src/features/resume/stylesheet/store.test.ts src/features/resume/stylesheet/worker-client.test.ts src/features/resume/builder/draft.test.ts
pnpm --filter web typecheck
```

Expected: PASS for compile/save debounce, stale worker results, worker termination/restart, serialized saves, conflict
rebase, cross-tab SSE, failed browser preflight, invalid source retention, history restore, and cleanup.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/resume/stylesheet apps/web/src/routes/builder apps/web/src/features/resume/builder
git commit -m "feat(web): add Semantic CSS editor state and worker"
```

---

### Task 16: Replace the Custom Styles Form with the CodeMirror Editor

**Files:**
- Create: `apps/web/src/features/resume/stylesheet/editor.tsx`
- Create: `apps/web/src/features/resume/stylesheet/status.tsx`
- Create: `apps/web/src/features/resume/stylesheet/toolbar.tsx`
- Create: `apps/web/src/features/resume/stylesheet/legacy-banner.tsx`
- Create: `apps/web/src/features/resume/stylesheet/focus-mode.ts`
- Create: `apps/web/src/features/resume/stylesheet/editor.test.tsx`
- Create: `apps/web/src/features/resume/stylesheet/focus-mode.test.ts`
- Modify: `apps/web/src/routes/builder/$resumeId/-sidebar/right/sections/custom-styles.tsx`
- Modify: `apps/web/src/routes/builder/$resumeId/-sidebar/right/sections/custom-styles.test.tsx`
- Modify: `apps/web/src/routes/builder/$resumeId/-sidebar/right/index.tsx`
- Modify: `apps/web/src/routes/builder/$resumeId/-store/sidebar.ts`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: compact/lazy editor, toolbar, status, activation banner, desktop/mobile focus mode.
- Consumes: Task 15 store.

- [ ] **Step 1: Install direct editor dependencies**

Run:

```bash
pnpm --filter web add \
  @codemirror/state@latest \
  @codemirror/view@latest \
  @codemirror/language@latest \
  @codemirror/lang-css@latest \
  @codemirror/commands@latest \
  @codemirror/search@latest \
  @codemirror/autocomplete@latest \
  @codemirror/lint@latest \
  prettier@latest
```

Expected: direct web dependencies and updated lockfile.

- [ ] **Step 2: Write failing component/focus-mode tests**

```tsx
it("shows last-valid status when source has errors", async () => {
	render(<CustomStylesSectionBuilder />);

	expect(await screen.findByText(/preview uses the last valid version/i)).toBeInTheDocument();
	expect(screen.getByRole("button", { name: /activate semantic css/i })).toBeDisabled();
});

it("resizes and restores the desktop right panel", () => {
	const restore = enterStylesheetFocusMode({ rightPanel, currentLayout });
	expect(rightPanel.current?.resize).toHaveBeenCalledWith("45%");

	restore();
	expect(setLayout).toHaveBeenCalledWith(currentLayout);
});

it("shows a read-only notice for an active semantic resume when authoring is disabled", () => {
	render(<CustomStylesSectionBuilder />, { flags: { semanticCssAuthoring: false }, mode: "semantic" });

	expect(screen.getByText(/semantic styles remain active/i)).toBeInTheDocument();
	expect(screen.queryByText(/target scope/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Verify RED**

Run:

```bash
pnpm --filter web test -- src/features/resume/stylesheet/editor.test.tsx src/features/resume/stylesheet/focus-mode.test.ts
```

Expected: FAIL on the editor/focus sentinel or first accessible status/resize assertion, not on module resolution.

- [ ] **Step 4: Implement direct CodeMirror lifecycle**

Create one `EditorView` per visible host, destroy on unmount, tag external replacements to avoid feedback, use
`Compartment`s for theme/read-only/diagnostics, and keep the document LTR even when the surrounding locale is RTL. Lazy
load the feature from the sidebar so the initial builder chunk does not include CodeMirror.

- [ ] **Step 5: Compose existing UI components**

Use:

- `Badge` for Applied/Warning/Error state;
- `Alert` for inactive legacy conversion and error explanation;
- `Button` with Phosphor icons and `data-icon`;
- `Tooltip` for compact toolbar labels;
- `ScrollArea` for diagnostics/reference;
- desktop panel resize for focus mode;
- `Sheet`, `SheetContent`, and required `SheetTitle` for mobile focus mode.

Do not add replacement shadcn components; all required components already exist.

- [ ] **Step 6: Remove legacy form internals but retain flag fallback**

When authoring is off and mode is legacy, keep the existing legacy form during compatibility rollout. When authoring is
off and mode is semantic, show a read-only `Alert` explaining that semantic styles remain active but this instance does
not allow editing; never show a legacy form that would attempt ignored/rejected changes. When authoring is on, render the
Semantic CSS shell. Do not delete legacy schema/PDF behavior. Conversion fills an inactive draft and shows explicit activation.

- [ ] **Step 7: Verify compact/focus/mobile/accessibility behavior**

Run:

```bash
pnpm --filter web test -- src/features/resume/stylesheet 'src/routes/builder/$resumeId/-sidebar/right/sections/custom-styles.test.tsx'
pnpm --filter web typecheck
```

Expected: PASS with accessible names, required mobile sheet title, no global undo interception, and no initial
CodeMirror chunk before opening Custom Styles.

- [ ] **Step 8: Commit**

```bash
git add apps/web/package.json apps/web/src pnpm-lock.yaml
git commit -m "feat(web): replace custom style form with Semantic CSS editor"
```

---

### Task 17: Add Registry-Driven Editor Intelligence and Explicit Formatting

**Files:**
- Create: `apps/web/src/features/resume/stylesheet/editor-extensions.ts`
- Create: `apps/web/src/features/resume/stylesheet/formatter.ts`
- Create: `apps/web/src/features/resume/stylesheet/editor-extensions.test.ts`
- Create: `apps/web/src/features/resume/stylesheet/formatter.test.ts`
- Modify: `apps/web/src/features/resume/stylesheet/editor.tsx`
- Modify: `apps/web/src/features/resume/stylesheet/toolbar.tsx`

**Interfaces:**
- Produces lint mapping, completion, hover, search, color swatches, and `formatSemanticCss`.
- Consumes compiler diagnostics and registries.

- [ ] **Step 1: Write failing extension/formatter tests**

```ts
it("completes semantic selectors, current IDs, properties, directives, and system variables", async () => {
	const labels = await getCompletionLabels(contextAt("--resume-"));

	expect(labels).toContain("--resume-primary-color");
	expect(labels).toContain("--resume-sidebar-width");
	expect(labels).not.toContain("--resume-font-family");
});

it("formats only on command and preserves comments and cursor", async () => {
	const result = await formatSemanticCss("/* keep */ section{color:red}", 18);

	expect(result.formatted).toContain("/* keep */");
	expect(result.cursorOffset).toBeGreaterThan(0);
});

it("leaves malformed source untouched when formatting fails", async () => {
	await expect(formatEditorDocument(view, "section {", 9)).rejects.toThrow();
	expect(view.dispatch).not.toHaveBeenCalled();
});

it("preserves exact clipboard text and accepts IME composition as one editor transaction", async () => {
	await copySourceToClipboard(view.state.doc.toString());
	composeText(view, "セクション");

	expect(navigator.clipboard.writeText).toHaveBeenCalledWith(view.state.doc.toString());
	expect(getHistoryEventCount(view)).toBe(1);
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm --filter web test -- src/features/resume/stylesheet/editor-extensions.test.ts src/features/resume/stylesheet/formatter.test.ts
```

Expected: FAIL on the extension/formatter sentinel or completion/transaction assertion, not on module resolution.

- [ ] **Step 3: Implement registry-only completions and hover**

Override unrestricted browser-CSS completion. Complete semantic elements/attributes/roles, current section/item IDs,
field names, current-template parts, registered properties/values/units, `@media`, `@version 1`, user variables,
read-only `--resume-*`, and structural `-resume-*`. Hover docs come from the same registries used by compiler validation.

- [ ] **Step 4: Implement diagnostics, search, and color widgets**

Map compiler ranges to CodeMirror lint diagnostics. Use `hoverTooltip`, `@codemirror/search`, and a visible-range
`ViewPlugin` for compiler-confirmed color tokens. A color widget opens one existing React `ColorPicker` popover; do not
mount one React root per token.

- [ ] **Step 5: Implement lazy explicit formatting**

Dynamic-import `prettier/standalone` and `prettier/plugins/postcss`, call `formatWithCursor({ parser: "css" })`, and apply
the result as one CodeMirror transaction/undo step. Do not format on paste, save, compile, conversion, or activation.

- [ ] **Step 6: Verify intelligence and production chunks**

Run:

```bash
pnpm --filter web test -- src/features/resume/stylesheet/editor-extensions.test.ts src/features/resume/stylesheet/formatter.test.ts
pnpm --filter web build
```

Expected: PASS for search/replace, exact copy/paste, IME composition, diagnostics, completion, hover, color widgets, and
formatting; build output has separate lazy chunks for CodeMirror/compiler/preflight workers and Prettier.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/resume/stylesheet apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): add Semantic CSS editor intelligence"
```

---

### Task 18: Integrate Applied Styles with Preview, Export, Public Viewer, and Versions

**Files:**
- Modify: `apps/web/src/features/resume/preview/preview.browser.tsx`
- Modify: `apps/web/src/features/resume/preview/preview.browser.test.tsx`
- Modify: `apps/web/src/features/resume/export/pdf-document.tsx`
- Modify: `apps/web/src/features/resume/public/pdf-viewer.tsx`
- Modify: `apps/web/src/features/resume/public/pdf-viewer.test.tsx`
- Modify: `apps/web/src/features/resume/public/public-resume.tsx`
- Modify: `apps/web/src/features/resume/public/public-resume.test.tsx`
- Modify: `apps/web/src/routes/builder/$resumeId/-components/version-history.tsx`

**Interfaces:**
- Produces one applied/projection-aware rendering path for preview/export/public surfaces.
- Consumes semantic PDF entrypoints, stylesheet store, public projection.

- [ ] **Step 1: Write failing last-valid and projection fallback tests**

```ts
it("keeps the active preview when editable source becomes invalid", async () => {
	render(<ResumePreviewClient />);
	await waitFor(() => expect(createResumePdfBlob).toHaveBeenCalledWith(expect.anything(), validAppliedOptions));

	setEditableSource("section {");

	expect(createResumePdfBlob).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ source: "section {" }));
});

it("refetches a mismatched public projection then falls back to the authorized PDF", async () => {
	render(<PdfViewer data={publicResumeData} styleProjection={mismatchedProjection} />);

	await waitFor(() => expect(refetchProjection).toHaveBeenCalledOnce());
	expect(fetchAuthorizedFallbackPdf).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm --filter web test -- src/features/resume/preview/preview.browser.test.tsx src/features/resume/public/pdf-viewer.test.tsx src/features/resume/public/public-resume.test.tsx
```

Expected: FAIL on the last-valid/projection-fallback assertion after typed prop shells compile.

- [ ] **Step 3: Pass applied presentation through all owner render paths**

Preview and browser export depend on `mode` plus `applied`, never editable source. Preserve the existing staged crossfade
and request-ID cancellation. Replace the preview's empty `catch` with controlled status/toast behavior while keeping the
last active PDF visible.

- [ ] **Step 4: Validate public projection and fallback**

Public viewer validates format/tree/registry/adapter versions and render hash. On mismatch, refetch once, then call the
authorized/rate-limited server PDF fallback. Legacy public resumes continue the current blob path during rollout.

- [ ] **Step 5: Reinitialize after import/duplicate/version restore**

Owner query responses return canonical stylesheet state/revisions. After version restore, reset stylesheet worker/store
from server state without restoring historical concurrency revision. JSON export includes stylesheet content but no
revision columns.

- [ ] **Step 6: Verify rendering parity and lifecycle**

Run:

```bash
pnpm --filter web test -- src/features/resume/preview src/features/resume/public
pnpm --filter @reactive-resume/pdf test -- src/browser.test.tsx src/server.test.tsx src/semantic
pnpm --filter web typecheck
```

Expected: PASS; browser preview, browser export, public viewer, and server export agree on applied content.

- [ ] **Step 7: Commit**

```bash
git add apps/web packages/pdf packages/api
git commit -m "feat: integrate Semantic CSS rendering surfaces"
```

---

### Task 19: Add Documentation, E2E Acceptance, Visual Coverage, and Rollout Gates

**Files:**
- Modify: `docs/guides/using-custom-styles.mdx`
- Create: `docs/guides/semantic-css-reference.mdx`
- Create: `tests/e2e/specs/semantic-css/legacy-conversion.spec.ts`
- Create: `tests/e2e/specs/semantic-css/invalid-last-valid.spec.ts`
- Create: `tests/e2e/specs/semantic-css/portable-stylesheet.spec.ts`
- Create: `tests/e2e/specs/semantic-css/revision-conflict.spec.ts`
- Create: `tests/e2e/specs/semantic-css/default-mode.spec.ts`
- Create: `tests/e2e/specs/semantic-css/dormant-mode.spec.ts`
- Create: `tests/e2e/specs/semantic-css/flag-off-semantic.spec.ts`
- Create: `tests/e2e/specs/semantic-css/template-visual.spec.ts`
- Create: `tests/e2e/specs/semantic-css/template-visual.spec.ts-snapshots/*.png`
- Create: `packages/pdf/src/semantic/all-templates-smoke.test.tsx`
- Create: `packages/pdf/src/semantic/all-templates-presentation.test.ts`
- Create: `tooling/semantic-css/generate-reference.ts`
- Create: `tooling/semantic-css/generate-reference.test.ts`
- Modify: `tooling/package.json`
- Modify: `package.json`
- Modify: `tests/e2e/README.md`
- Modify: `.github/workflows/e2e.yml`

**Interfaces:**
- Produces user reference and release gates.
- Consumes all prior milestones.

- [ ] **Step 1: Write the final failing end-to-end acceptance tests**

The portable fixture must include:

```css
@version 1;

:root {
	--accent: var(--resume-primary-color);
}

header > name {
	color: var(--accent);
}

section:is([type="experience"], [type="education"]) > section-heading {
	text-transform: uppercase;
}

section[id="projects"] > section-items > item {
	padding: 6pt;
}

section[id="experience"] item[id="experience-item-2"] field[name="period"] {
	color: var(--accent);
}

rich-text list-item > list-item-content {
	line-height: 1.25;
}

region[placement="sidebar"] section {
	background-color: rgba(0, 0, 0, 0.04);
}

section[type="projects"] {
	break-inside: avoid;
	-resume-min-presence-ahead: 24pt;
}

@media (max-width: 600pt) {
	region[placement="sidebar"] section-heading {
		font-size: 9pt;
	}
}

resume[template="azurill"] template-part[name="timeline-dot"] {
	background-color: var(--accent);
}
```

The E2E test pastes it into at least Onyx, Azurill, and Ditto; verifies group, exact section, header, system variable,
placement, exact item/field, rich text, media query, pagination directive, and template-part behavior; introduces invalid
syntax; verifies last-valid preview/export; fixes it; then verifies preview/export update together.

- [ ] **Step 2: Verify RED**

Run:

```bash
FLAG_SEMANTIC_CSS_AUTHORING=true FLAG_SEMANTIC_CSS_DEFAULT=false pnpm exec playwright test \
  tests/e2e/specs/semantic-css/legacy-conversion.spec.ts \
  tests/e2e/specs/semantic-css/invalid-last-valid.spec.ts \
  tests/e2e/specs/semantic-css/portable-stylesheet.spec.ts \
  tests/e2e/specs/semantic-css/revision-conflict.spec.ts \
  tests/e2e/specs/semantic-css/template-visual.spec.ts
pnpm --filter @reactive-resume/pdf test -- src/semantic/all-templates-smoke.test.tsx
```

Expected: FAIL on visible Semantic CSS behavior, screenshot, or documentation-staleness assertions; module/configuration errors
must be fixed before continuing.

- [ ] **Step 3: Write migration and language documentation**

Document:

- Semantic CSS vs browser CSS;
- `@version`;
- semantic tree/selectors and exact IDs;
- read-only `--resume-*` tokens;
- supported property matrix and units;
- structural/pagination directives;
- diagnostics and last-valid behavior;
- legacy conversion/activation;
- portability guidance and template-part manifests;
- unsupported fonts/assets/Grid/interaction;
- gradients/shadows as future SVG-backed extensions.

Generate registry tables from typed registries; fail tests if generated reference output is stale.

`tooling/semantic-css/generate-reference.ts` imports the public registry export and writes only the generated reference
sections. Add root script `docs:semantic-css` and tooling test that generates into a temporary file and compares it with
the committed MDX. Add `@reactive-resume/resume` as a tooling workspace dependency and a Vitest `test` script before
running:

```bash
pnpm --filter @reactive-resume/tooling add "@reactive-resume/resume@workspace:*"
pnpm --filter @reactive-resume/tooling add -D vitest@latest
pnpm docs:semantic-css
pnpm --filter @reactive-resume/tooling test -- semantic-css/generate-reference.test.ts
```

- [ ] **Step 4: Add all-template smoke and visual regression**

Render all 15 templates with the comprehensive fixture in `all-templates-smoke.test.tsx` and snapshot each resolved
presentation map in `all-templates-presentation.test.ts`. `template-visual.spec.ts` uses Playwright
`expect(page).toHaveScreenshot()` for one deterministic first-page preview per template; committed Linux/Chromium
baselines live in its `-snapshots` directory and update only with:

```bash
pnpm exec playwright test tests/e2e/specs/semantic-css/template-visual.spec.ts --update-snapshots
```

Registry coverage asserts every semantic kind, conditional field, role, and template part is exercised. The existing
E2E workflow already uploads Playwright reports; extend its commands so Semantic CSS tests run under explicit flag states:

```bash
FLAG_SEMANTIC_CSS_AUTHORING=false FLAG_SEMANTIC_CSS_DEFAULT=false pnpm exec playwright test --grep-invert "@semantic-css"
FLAG_SEMANTIC_CSS_AUTHORING=true FLAG_SEMANTIC_CSS_DEFAULT=false pnpm exec playwright test \
  tests/e2e/specs/semantic-css/legacy-conversion.spec.ts \
  tests/e2e/specs/semantic-css/invalid-last-valid.spec.ts \
  tests/e2e/specs/semantic-css/portable-stylesheet.spec.ts \
  tests/e2e/specs/semantic-css/revision-conflict.spec.ts \
  tests/e2e/specs/semantic-css/template-visual.spec.ts
FLAG_SEMANTIC_CSS_AUTHORING=true FLAG_SEMANTIC_CSS_DEFAULT=true pnpm exec playwright test tests/e2e/specs/semantic-css/default-mode.spec.ts
FLAG_SEMANTIC_CSS_AUTHORING=false FLAG_SEMANTIC_CSS_DEFAULT=false pnpm exec playwright test \
  tests/e2e/specs/semantic-css/dormant-mode.spec.ts \
  tests/e2e/specs/semantic-css/flag-off-semantic.spec.ts
```

Document those commands in `tests/e2e/README.md`. The default-on test asserts a new resume starts semantic; the dormant
test asserts the legacy form/render path and old-client update preservation remain available. The flag-off-semantic test
seeds an active semantic resume, verifies semantic rendering remains active, and verifies Custom Styles shows a
read-only unavailable notice instead of the legacy form. Tag every Semantic CSS test title with `@semantic-css` so the baseline
flag-off run excludes only this feature suite.

- [ ] **Step 5: Perform manual GUI walkthrough and record evidence**

Start the app with the documented Postgres/environment setup. Use the computer-use workflow to:

1. Open a legacy resume and inspect converted inactive source.
2. Activate after parity.
3. Paste the portable stylesheet.
4. Exercise compact and expanded/focus modes.
5. Trigger an error and confirm the preview remains last-valid.
6. Resolve the error and export the matching PDF.
7. Test desktop and mobile layout.

Record one concise video beginning immediately before the successful demonstration and ending immediately after export.

- [ ] **Step 6: Run package and repository gates**

Run:

```bash
pnpm --filter @reactive-resume/schema test
pnpm --filter @reactive-resume/resume test
pnpm --filter @reactive-resume/pdf test
pnpm --filter @reactive-resume/api test
pnpm --filter web test
pnpm exec turbo boundaries
pnpm typecheck
pnpm build
FLAG_SEMANTIC_CSS_AUTHORING=true FLAG_SEMANTIC_CSS_DEFAULT=false pnpm exec playwright test \
  tests/e2e/specs/semantic-css/legacy-conversion.spec.ts \
  tests/e2e/specs/semantic-css/invalid-last-valid.spec.ts \
  tests/e2e/specs/semantic-css/portable-stylesheet.spec.ts \
  tests/e2e/specs/semantic-css/revision-conflict.spec.ts \
  tests/e2e/specs/semantic-css/template-visual.spec.ts
FLAG_SEMANTIC_CSS_AUTHORING=true FLAG_SEMANTIC_CSS_DEFAULT=true pnpm exec playwright test tests/e2e/specs/semantic-css/default-mode.spec.ts
FLAG_SEMANTIC_CSS_AUTHORING=false FLAG_SEMANTIC_CSS_DEFAULT=false pnpm exec playwright test \
  tests/e2e/specs/semantic-css/dormant-mode.spec.ts \
  tests/e2e/specs/semantic-css/flag-off-semantic.spec.ts
pnpm check
git diff --check
```

Expected: every command exits 0; `pnpm check` may rewrite files, so inspect and include only intended formatting.

- [ ] **Step 7: Verify rollout states**

Test:

1. both flags false: dormant backend and legacy editor/rendering;
2. authoring true/default false: opt-in conversion and explicit activation;
3. authoring false on an already semantic resume: rendering still honors persisted semantic mode;
4. both true: new resumes begin semantic with empty v1 source;
5. mixed old client update: server preserves stylesheet;
6. public projection mismatch: authorized fallback;
7. rollback: legacy rules retained and semantic mode can be disabled per resume without double application.

- [ ] **Step 8: Commit**

```bash
git add docs tests/e2e packages/pdf tooling package.json pnpm-lock.yaml .github/workflows/e2e.yml
git commit -m "docs: add Semantic CSS reference and acceptance coverage"
```

---

## Final Review Checklist

- [ ] Every production behavior was introduced by a test that first failed for the expected reason.
- [ ] Compiler v1 is immutable and selected by persisted version.
- [ ] Generated/default source contains `@version 1;`; missing hand-written directive only warns in v1.
- [ ] Reserved `--resume-*` variables expose base visual settings but not font family or assets.
- [ ] Compiler, worker protocol, and public projection contain only structured-clone/JSON-safe plain values.
- [ ] Generic updates and patches cannot overwrite server-owned stylesheet state.
- [ ] Preflight happens outside locks; short CAS checks stylesheet revision and render-data version.
- [ ] No semantic instrumentation added a React PDF layout wrapper.
- [ ] Structural selectors match source order and apply only once.
- [ ] All 15 templates publish manifests and pass smoke/visual coverage.
- [ ] #3146, #3134, #3137, #2223, and #3199 are named regression fixtures.
- [ ] Legacy conversion is behavioral, deterministic, parity-gated, and never double-applied.
- [ ] Editable/applied source and diagnostics are owner-only.
- [ ] Public projection hash/fingerprint mismatches use an authorized, rate-limited fallback.
- [ ] CodeMirror and Prettier remain lazy chunks.
- [ ] Desktop focus mode preserves the preview through panel resize; mobile Sheet has an accessible title.
- [ ] Invalid source survives reload while preview/export use the last valid applied source.
- [ ] DOCX/Markdown output remains unchanged.
- [ ] Documentation tables are generated from runtime registries.
- [ ] Full tests, typechecks, boundaries, build, lint/format, E2E, and manual video walkthrough are green.

## Execution Notes

- Recommended execution style: subagent-driven development with one fresh implementer per task and a specification review
  plus code-quality review after each task.
- Use one logical commit per task. Do not squash or amend unless explicitly requested.
- Backend safety (Task 7) can deploy dormant before PDF/editor work. Do not enable authoring until Tasks 1–14 are green.
- The largest risk is Tasks 8–10: descriptor parity across shared sections, rich text, and all templates. Stop and revise
  the semantic registry if these tasks require styling-only wrappers.
- The second largest risk is Task 12: legacy behavioral parity. Activation must remain blocked on mismatch rather than
  silently changing existing resumes.
- The public projection and server preflight may add meaningful CPU cost. Capture render duration, source size, output
  page count, preflight failures, activation failures, projection mismatch, and fallback usage in existing structured
  server logs before opt-in rollout.
