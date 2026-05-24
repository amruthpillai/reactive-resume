# Phosphor HTML Icon Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-maintained HTML icon SVG map with renderer-generated Phosphor-sourced SVGs so all HTML templates use the same canonical icon geometry and sizing contract.

**Architecture:** Keep `iconSvg(...)` as the renderer/template interface, but change its backing data source from a handwritten `iconSvgPaths` object to a generated Phosphor-derived map. Use the installed `@phosphor-icons/web` package as build-time source data, generate a small checked-in TypeScript module in `packages/renderer`, and keep template CSS responsible only for icon size/color/alignment.

**Tech Stack:** TypeScript, Vitest, Nunjucks filters, `@phosphor-icons/web` source data, pnpm workspace scripts

---

## Scope

This plan only covers renderer-side icon fidelity for the HTML template engine. It does **not** change:

- template JSON schema
- section markup contracts
- preview pagination
- webfont/icon-font loading in templates

It also intentionally avoids runtime parsing of the 2 MB+ Phosphor metadata file. The renderer should read a compact generated module checked into the repo.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `packages/renderer/src/filters.ts` | Modify | Replace handwritten icon geometry lookup with imported generated map |
| `packages/renderer/src/filters.test.ts` | Modify | Assert specific SVG content for representative icons and fallback behavior |
| `packages/renderer/src/render.test.ts` | Modify | Assert rendered HTML includes expected icon SVG markers after migration |
| `packages/renderer/src/generated/phosphor-icons.ts` | Create | Compact checked-in icon map used by `iconSvg(...)` at runtime |
| `tooling/generate-phosphor-icon-map.ts` | Create | One-off/generative script to extract selected icons from `@phosphor-icons/web/src/Phosphor.json` |
| `packages/renderer/package.json` | Modify | Add script to regenerate the checked-in icon map |
| `package.json` | Modify | Optional root alias for the renderer icon generation script if desired for maintainability |
| `docs/superpowers/plans/2026-05-24-phosphor-html-icon-migration.md` | This file | Execution plan |

---

## Analysis Summary

Current renderer state:

- `packages/renderer/src/filters.ts` contains a handwritten `iconSvgPaths` object.
- It mixes two incompatible shape families:
  - some icons use real 256x256 Phosphor-like filled paths
  - others use simplified 24x24 stroke approximations
- The visual regression the user pointed out (`code`, `cpu`, and similar skill icons) comes from those simplified approximations, not CSS size alone.

Available source of truth:

- `packages/ui/node_modules/@phosphor-icons/web/src/Phosphor.json`
- This file contains exact regular-weight icon path data at `256x256`.
- All currently relevant renderer keys are present:
  - `envelope`
  - `phone`
  - `map-pin`
  - `globe`
  - `github-logo`
  - `linkedin-logo`
  - `game-controller`
  - `code`
  - `brackets-curly`
  - `cpu`
  - `brain`
  - `shooting-star`
  - `chart-line-up`
  - `robot`
  - `book-open`
  - `pen-nib`
  - `star`

Why not use `@phosphor-icons/web` directly in templates:

- `style.css` + `woff2/woff/ttf/svg` is heavier than necessary
- `selection.json` is ~2 MB for regular alone
- icon-font rendering adds a second styling/runtime path
- the current engine already has a good renderer/template seam via `iconSvg(...)`

So the correct migration is:

1. build a compact generated icon map from Phosphor source data
2. import that map in `filters.ts`
3. keep `iconSvg(...)` as the only template-facing API

---

## Task 1: Lock in Renderer Behavior with Failing Tests

**Files:**
- Modify: `packages/renderer/src/filters.test.ts`
- Modify: `packages/renderer/src/render.test.ts`

- [ ] **Step 1: Add failing `iconSvg` tests for canonical Phosphor-backed icons**

Add tests that assert:

- `code` renders a filled `viewBox="0 0 256 256"` SVG
- `cpu` renders a filled `viewBox="0 0 256 256"` SVG
- `brackets-curly` is no longer emitted as the current 24x24 stroke approximation
- unknown icons still fall back to `star`

Suggested test shape in `packages/renderer/src/filters.test.ts`:

```ts
describe("iconSvg filter", () => {
	it("renders canonical Phosphor geometry for code", () => {
		const env = makeEnv();
		const result = env.renderString("{{ 'code' | iconSvg('item-icon') }}");

		expect(result).toContain('viewBox="0 0 256 256"');
		expect(result).toContain('fill="currentColor"');
		expect(result).toContain("M216,40H40");
	});

	it("renders canonical Phosphor geometry for cpu", () => {
		const env = makeEnv();
		const result = env.renderString("{{ 'cpu' | iconSvg('item-icon') }}");

		expect(result).toContain('viewBox="0 0 256 256"');
		expect(result).toContain("M104,104h48v48H104");
	});

	it("falls back to star for unknown icons", () => {
		const env = makeEnv();
		const result = env.renderString("{{ 'not-a-real-icon' | iconSvg('item-icon') }}");

		expect(result).toContain("m12 3");
	});
});
```

- [ ] **Step 2: Run focused tests and confirm at least one new assertion fails**

Run:

```bash
pnpm --filter @reactive-resume/renderer exec vitest run src/filters.test.ts src/render.test.ts
```

Expected:

- failure in `filters.test.ts` because current `filters.ts` still uses handwritten icon data

- [ ] **Step 3: Add one rendered-HTML regression in `render.test.ts`**

Extend the Azurill render test to assert that generated HTML contains a representative canonical Phosphor path for a skill icon:

```ts
expect(html).toContain("M104,104h48v48H104");
```

- [ ] **Step 4: Re-run the focused tests and verify the new render assertion fails**

Run:

```bash
pnpm --filter @reactive-resume/renderer exec vitest run src/render.test.ts
```

Expected:

- fail until the generated icon map is wired in

- [ ] **Step 5: Commit the failing tests**

```bash
git add packages/renderer/src/filters.test.ts packages/renderer/src/render.test.ts
git commit -m "test(renderer): lock phosphor html icon geometry"
```

---

## Task 2: Generate a Compact Phosphor Icon Module

**Files:**
- Create: `tooling/generate-phosphor-icon-map.ts`
- Create: `packages/renderer/src/generated/phosphor-icons.ts`
- Modify: `packages/renderer/package.json`
- Modify: `package.json`

- [ ] **Step 1: Create the generator script**

Create `tooling/generate-phosphor-icon-map.ts` that:

- reads `packages/ui/node_modules/@phosphor-icons/web/src/Phosphor.json`
- extracts only the icon names used by the HTML renderer
- writes a compact TypeScript file at `packages/renderer/src/generated/phosphor-icons.ts`

The generator should define an explicit allowlist:

```ts
const iconNames = [
	"envelope",
	"phone",
	"map-pin",
	"globe",
	"github-logo",
	"linkedin-logo",
	"game-controller",
	"code",
	"brackets-curly",
	"cpu",
	"brain",
	"shooting-star",
	"chart-line-up",
	"robot",
	"book-open",
	"pen-nib",
	"star",
] as const;
```

Suggested output shape:

```ts
export const phosphorIconMap = {
	code: {
		viewBox: "0 0 256 256",
		fill: true,
		paths: ["<path d=\"...\"/>"],
	},
	// ...
} as const;
```

- [ ] **Step 2: Add package scripts**

Modify `packages/renderer/package.json` to add:

```json
{
  "scripts": {
    "generate:icons": "tsx ../../tooling/generate-phosphor-icon-map.ts"
  }
}
```

Optionally add a root alias in `package.json`:

```json
{
  "scripts": {
    "generate:renderer-icons": "pnpm --filter @reactive-resume/renderer generate:icons"
  }
}
```

- [ ] **Step 3: Run the generator and inspect the checked-in output**

Run:

```bash
pnpm --filter @reactive-resume/renderer generate:icons
```

Expected:

- `packages/renderer/src/generated/phosphor-icons.ts` exists
- all allowlisted icon keys are present
- every icon uses `viewBox: "0 0 256 256"`
- no extra icon names are emitted

- [ ] **Step 4: Commit the generator and generated module**

```bash
git add tooling/generate-phosphor-icon-map.ts packages/renderer/package.json package.json packages/renderer/src/generated/phosphor-icons.ts
git commit -m "feat(renderer): generate compact phosphor html icon map"
```

---

## Task 3: Replace Handwritten Renderer Geometry

**Files:**
- Modify: `packages/renderer/src/filters.ts`
- Test: `packages/renderer/src/filters.test.ts`
- Test: `packages/renderer/src/render.test.ts`

- [ ] **Step 1: Replace the handwritten `iconSvgPaths` object with the generated import**

In `packages/renderer/src/filters.ts`:

- remove the handwritten icon map
- import the generated map
- keep the runtime API unchanged

Target structure:

```ts
import { phosphorIconMap } from "./generated/phosphor-icons";

const renderIconSvg = (name: unknown, className = ""): nunjucks.runtime.SafeString => {
	if (typeof name !== "string" || name.trim() === "") return new nunjucks.runtime.SafeString("");

	const icon = phosphorIconMap[name as keyof typeof phosphorIconMap] ?? phosphorIconMap.star;
	const classAttr = className ? ` class="${className}"` : "";
	const svg = `<svg${classAttr} viewBox="${icon.viewBox}" fill="${icon.fill ? "currentColor" : "none"}"${
		icon.fill ? "" : ' stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'
	} aria-hidden="true" focusable="false">${icon.paths.join("")}</svg>`;

	return new nunjucks.runtime.SafeString(svg);
};
```

Implementation note:

- if all selected Phosphor icons are filled regular icons, simplify the output shape and drop the stroke branch entirely
- do not keep the old approximations around “just in case”

- [ ] **Step 2: Run the focused renderer tests**

Run:

```bash
pnpm --filter @reactive-resume/renderer exec vitest run src/filters.test.ts src/render.test.ts
```

Expected:

- all tests pass

- [ ] **Step 3: Spot-check one generated HTML render**

Run:

```bash
pnpm --filter @reactive-resume/renderer exec vitest run src/render.test.ts
```

Then inspect the rendered output assertion coverage to ensure the `code`/`cpu` paths are present.

- [ ] **Step 4: Commit the runtime migration**

```bash
git add packages/renderer/src/filters.ts packages/renderer/src/filters.test.ts packages/renderer/src/render.test.ts
git commit -m "feat(renderer): use phosphor source data for html icons"
```

---

## Task 4: Rebuild Archives and Validate Template Packaging

**Files:**
- Modify: none expected
- Verify: `packages/pdf/src/templates/*.rxt`

- [ ] **Step 1: Rebuild the template archives**

Run:

```bash
pnpm build:rxt
```

Expected:

- all 15 `.rxt` archives rebuild successfully

- [ ] **Step 2: Confirm a rebuilt archive contains canonical icon geometry**

Run:

```bash
unzip -p packages/pdf/src/templates/azurill.rxt index.html | rg "M104,104h48v48H104|M216,40H40|github-logo|linkedin-logo"
```

Expected:

- representative Phosphor path data appears in the packaged template output

- [ ] **Step 3: Commit rebuilt archives if they changed**

```bash
git add packages/pdf/src/templates/*.rxt
git commit -m "build(pdf): rebuild template archives after icon migration"
```

---

## Task 5: Browser Validation Against the Live Builder

**Files:**
- Modify: only if follow-up CSS sizing/alignment fixes are required
- Verify: live builder output in localhost

- [ ] **Step 1: Open the existing localhost builder in MCP Playwright**

Use MCP Playwright to load the current builder route and inspect page 1 of Azurill.

Success criteria:

- `Programming Languages` no longer uses the simplified square/cpu approximation
- `Unity Engine` no longer uses the simplified `</>` approximation
- `GitHub`/`LinkedIn` icons match the original Phosphor silhouette more closely

- [ ] **Step 2: Capture before/after screenshots for icon rows**

Take targeted screenshots of:

- header contact row
- profiles section
- skills section

Save under:

```text
output/playwright/
```

- [ ] **Step 3: Apply only template-level CSS adjustments if needed**

If icon geometry is correct but visual balance is still off, limit fixes to CSS in:

- `packages/pdf/src/templates/azurill/html/index.html`

Allowed follow-up adjustments:

- `width` / `height` from `0.95em` to `1em`
- gap tuning between icon and label
- baseline alignment

Do **not** alter the generated Phosphor geometry at this stage.

- [ ] **Step 4: Rebuild archives after any template CSS change**

Run:

```bash
pnpm build:rxt
```

- [ ] **Step 5: Commit the visual validation pass**

```bash
git add packages/pdf/src/templates/azurill/html/index.html packages/pdf/src/templates/*.rxt
git commit -m "fix(pdf): tune html icon sizing after phosphor migration"
```

---

## Self-Review

Spec coverage:

- Root cause captured: handwritten mixed icon geometry in `filters.ts`
- Source of truth identified: `@phosphor-icons/web/src/Phosphor.json`
- Runtime boundary preserved: templates still call `iconSvg(...)`
- All-template benefit preserved: renderer-side migration, not per-template icon rewrites
- Packaging/rebuild/browser verification included

Placeholder scan:

- No `TODO`/`TBD`
- All file paths are explicit
- Commands are concrete
- Tests include actual assertions

Type consistency:

- generated map name is consistently `phosphorIconMap`
- renderer API remains `iconSvg(...)`
- selected icon names match current renderer/sample usage

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-24-phosphor-html-icon-migration.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
