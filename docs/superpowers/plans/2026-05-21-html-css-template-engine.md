# HTML/CSS Template Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the React PDF template system with a Nunjucks-based HTML template engine where templates are portable `.rxt` archives, custom inputs are declared with `<resume-slot>` tags, fonts are bundled or declared in `template.json`, and PDF generation uses Puppeteer.

**Architecture:** Templates are `.rxt` zip archives containing `template.json`, `index.html`, per-section files, optional styles, and optional font files. A `packages/renderer` package wraps Nunjucks with a custom in-memory zip loader, custom filters, and CSS/font injection. All templates (built-in + user-imported) live in the DB, seeded on startup. The same `render(files, data)` call runs in both browser (iframe preview) and server (Puppeteer PDF).

**Spec:** `docs/superpowers/specs/2026-05-21-html-css-template-engine.md`

**Tech Stack:** Nunjucks 3.x, jszip, Nunjucks custom loader, Puppeteer (Phase 3), Vitest

---

## Scope

Phases 1 and 2 are fully specified here. Phases 3–8 are sketched — each becomes its own plan once the prior phase is complete.

| Phase | Scope |
|---|---|
| **1** | Schema: `extensions` on `baseItemSchema`, `fontDeclarationSchema`, `resumeSlotSchema`, `templateMetadataSchema`, `parsedTemplateSchema` |
| **2** | `packages/renderer`: zip loader, Nunjucks environment, filters, CSS/font injection, `render(files, data)`, `parseTemplate(zipBuffer)` |
| 3 | `packages/pdf` + `apps/server`: Puppeteer PDF generation, font file serving endpoint |
| 4 | `apps/web`: Builder preview migrates from React PDF viewer to iframe |
| 5 | DB schema + startup seeding + import/export API + font picker integration + preview image generation |
| 6 | `apps/web`: Template-aware item editor (custom input fields from `<resume-slot>`) |
| 7 | `packages/pdf`: Migrate all 15 built-in templates to `.rxt` archives |
| 8 | New template: Khaled's resume design + authoring guide finalized |

---

## File Map

### Phase 1 — Schema (`packages/schema`)

| File | Action | Purpose |
|---|---|---|
| `packages/schema/src/resume/data.ts` | Modify | Add `extensions` to `baseItemSchema` |
| `packages/schema/src/resume/data.test.ts` | Create | Test `extensions` field |
| `packages/schema/src/template-metadata.ts` | Create | `fontDeclarationSchema`, `resumeSlotSchema`, `templateMetadataSchema`, `parsedTemplateSchema` |
| `packages/schema/src/template-metadata.test.ts` | Create | Validation tests |
| `packages/schema/package.json` | Modify | Add `./template-metadata` export path |

### Phase 2 — Renderer (`packages/renderer`)

| File | Action | Purpose |
|---|---|---|
| `packages/renderer/package.json` | Create | Package manifest with nunjucks + jszip |
| `packages/renderer/tsconfig.json` | Create | TypeScript config |
| `packages/renderer/turbo.json` | Create | Turbo tags |
| `packages/renderer/vitest.config.ts` | Create | Vitest with happy-dom |
| `packages/renderer/src/index.ts` | Create | Public exports |
| `packages/renderer/src/filters.ts` | Create | Custom Nunjucks filters (`selectVisible`, `levelDots`, `formatDate`) |
| `packages/renderer/src/loader.ts` | Create | Nunjucks custom loader — resolves includes from in-memory file map |
| `packages/renderer/src/environment.ts` | Create | Nunjucks environment factory using custom loader |
| `packages/renderer/src/css-injection.ts` | Create | Builds `--resume-*` CSS vars block + `@font-face` block from `ResumeData` + template metadata |
| `packages/renderer/src/render.ts` | Create | `render(files, data) → string` |
| `packages/renderer/src/parse-template.ts` | Create | `parseTemplate(zipBuffer) → ParsedTemplate` with 6-layer validation |
| `packages/renderer/src/filters.test.ts` | Create | Filter unit tests |
| `packages/renderer/src/loader.test.ts` | Create | Loader unit tests |
| `packages/renderer/src/render.test.ts` | Create | Render integration tests |
| `packages/renderer/src/parse-template.test.ts` | Create | Template parser + validation tests |

### Phase 5 — DB schema + startup seeding + import/export API

| File | Action | Purpose |
|---|---|---|
| `packages/db/src/schema/templates.ts` | Create | Drizzle `templates` table schema |
| `packages/pdf/src/templates/<name>.rxt` | Create (×15) | Built-in template `.rxt` seed archives |
| `apps/server/src/startup/seed-templates.ts` | Create | Upserts built-in templates from `.rxt` files into DB on boot |
| `apps/server/src/startup/checks.ts` | Modify | Call `seedTemplates()` after migrations |
| `packages/api/src/features/templates/` | Create | oRPC procedures: `list`, `import`, `export`, `delete` |
| `apps/server/src/http/fonts.ts` | Create | `/api/templates/:id/fonts/:filename` static route for bundled fonts |
| `docs/templates/authoring-guide.md` | Create | Template authoring reference (Phase 5 stub, finalized in Phase 8) |

---

## Task 1: Add `extensions` to `baseItemSchema`

**Files:**
- Modify: `packages/schema/src/resume/data.ts`
- Create: `packages/schema/src/resume/data.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/schema/src/resume/data.test.ts
import { describe, expect, it } from "vitest";
import { baseItemSchema, experienceItemSchema } from "./data";

describe("baseItemSchema", () => {
  it("accepts extensions as a record of unknown values", () => {
    const result = baseItemSchema.safeParse({
      id: "item-1",
      hidden: false,
      extensions: { additionalHtml: "<p>extra</p>", logoUrl: "https://example.com/logo.png" },
    });
    expect(result.success).toBe(true);
    expect(result.data?.extensions).toEqual({
      additionalHtml: "<p>extra</p>",
      logoUrl: "https://example.com/logo.png",
    });
  });

  it("defaults extensions to empty object when absent", () => {
    const result = baseItemSchema.safeParse({ id: "item-1", hidden: false });
    expect(result.success).toBe(true);
    expect(result.data?.extensions).toEqual({});
  });

  it("defaults extensions to empty object when null is passed", () => {
    const result = baseItemSchema.safeParse({ id: "item-1", hidden: false, extensions: null });
    expect(result.success).toBe(true);
    expect(result.data?.extensions).toEqual({});
  });
});

describe("experienceItemSchema", () => {
  it("inherits extensions from baseItemSchema", () => {
    const result = experienceItemSchema.safeParse({
      id: "exp-1",
      hidden: false,
      company: "Careem",
      position: "Infrastructure Engineer",
      location: "Dubai",
      period: "Feb 2023 – Present",
      website: { url: "", label: "", inlineLink: false },
      description: "",
      roles: [],
      extensions: { logoUrl: "https://example.com/careem.png" },
    });
    expect(result.success).toBe(true);
    expect(result.data?.extensions?.logoUrl).toBe("https://example.com/careem.png");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @reactive-resume/schema test -- src/resume/data.test.ts
```

Expected: FAIL — `extensions` field does not exist on `baseItemSchema`

- [ ] **Step 3: Add `extensions` to `baseItemSchema` in `data.ts`**

Find `baseItemSchema` and add the `extensions` field:

```typescript
export const baseItemSchema = z.object({
  id: z.string().describe("The unique identifier for the item. Usually generated as a UUID."),
  hidden: z.boolean().describe("Whether to hide the item from the resume."),
  extensions: z
    .record(z.unknown())
    .catch({})
    .describe("Template-specific custom data keyed by resume-slot id."),
});
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @reactive-resume/schema test -- src/resume/data.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Run full schema typecheck**

```bash
pnpm --filter @reactive-resume/schema typecheck
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add packages/schema/src/resume/data.ts packages/schema/src/resume/data.test.ts
git commit -m "feat(schema): add extensions bag to baseItemSchema for template-defined custom inputs"
```

---

## Task 2: Template metadata, font, and resume-slot schemas

**Files:**
- Create: `packages/schema/src/template-metadata.ts`
- Create: `packages/schema/src/template-metadata.test.ts`
- Modify: `packages/schema/package.json`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/schema/src/template-metadata.test.ts
import { describe, expect, it } from "vitest";
import {
  templateMetadataSchema,
  fontDeclarationSchema,
  typographySlotSchema,
  resumeSlotSchema,
  parsedTemplateSchema,
} from "./template-metadata";

describe("fontDeclarationSchema", () => {
  it("accepts a valid bundled font", () => {
    const result = fontDeclarationSchema.safeParse({
      family: "Playfair Display",
      weights: [400, 700],
      source: "bundled",
      files: { "400": "fonts/playfair-400.woff2", "700": "fonts/playfair-700.woff2" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid google font", () => {
    const result = fontDeclarationSchema.safeParse({
      family: "Inter",
      weights: [400, 600],
      source: "google",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown source", () => {
    const result = fontDeclarationSchema.safeParse({
      family: "Inter",
      weights: [400],
      source: "custom",
    });
    expect(result.success).toBe(false);
  });
});

describe("templateMetadataSchema", () => {
  it("accepts a valid metadata object", () => {
    const result = templateMetadataSchema.safeParse({
      id: "khaled",
      name: "Khaled",
      sidebarPosition: "left",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional fields", () => {
    const result = templateMetadataSchema.safeParse({
      id: "khaled",
      name: "Khaled",
      sidebarPosition: "none",
      author: "Khaled AbuShqear",
      description: "A two-column layout",
      tags: ["Two-column", "Technical"],
      fonts: [{ family: "Inter", weights: [400], source: "google" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts sidebarPosition either", () => {
    const result = templateMetadataSchema.safeParse({
      id: "khaled",
      name: "Khaled",
      sidebarPosition: "either",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid sidebarPosition", () => {
    const result = templateMetadataSchema.safeParse({
      id: "khaled",
      name: "Khaled",
      sidebarPosition: "center",
    });
    expect(result.success).toBe(false);
  });
});

describe("resumeSlotSchema", () => {
  it("accepts a valid rich-text slot", () => {
    const result = resumeSlotSchema.safeParse({
      id: "additionalHtml",
      itemType: "experienceItem",
      type: "rich-text",
      label: "Additional section",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all input types", () => {
    for (const type of ["rich-text", "text", "image", "image-list", "url", "toggle"]) {
      const result = resumeSlotSchema.safeParse({
        id: "field",
        itemType: "experienceItem",
        type,
        label: "Field",
      });
      expect(result.success).toBe(true);
    }
  });

  it("defaults required to false", () => {
    const result = resumeSlotSchema.safeParse({
      id: "field",
      itemType: "skillItem",
      type: "text",
      label: "Field",
    });
    expect(result.success).toBe(true);
    expect(result.data?.required).toBe(false);
  });

  it("rejects unknown item type", () => {
    const result = resumeSlotSchema.safeParse({
      id: "field",
      itemType: "unknownItem",
      type: "text",
      label: "Field",
    });
    expect(result.success).toBe(false);
  });
});

describe("typographySlotSchema", () => {
  it("accepts a slot with all fields", () => {
    const result = typographySlotSchema.safeParse({
      id: "name",
      label: "Your name",
      defaultFont: "Playfair Display",
      defaultSize: 28,
      defaultWeight: 700,
      defaultLineHeight: 1.2,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a slot with only required fields", () => {
    const result = typographySlotSchema.safeParse({ id: "caption", label: "Dates & locations" });
    expect(result.success).toBe(true);
  });

  it("rejects a slot without id", () => {
    const result = typographySlotSchema.safeParse({ label: "Body text" });
    expect(result.success).toBe(false);
  });
});

describe("templateMetadataSchema — typography", () => {
  it("accepts metadata with typography slots", () => {
    const result = templateMetadataSchema.safeParse({
      id: "khaled",
      name: "Khaled",
      sidebarPosition: "left",
      typography: [
        { id: "name", label: "Your name", defaultFont: "Playfair Display", defaultSize: 28 },
        { id: "body", label: "Body text", defaultSize: 10 },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.data?.typography).toHaveLength(2);
  });

  it("defaults typography to empty array when absent", () => {
    const result = templateMetadataSchema.safeParse({
      id: "onyx",
      name: "Onyx",
      sidebarPosition: "none",
    });
    expect(result.success).toBe(true);
    expect(result.data?.typography).toEqual([]);
  });
});

describe("parsedTemplateSchema", () => {
  it("accepts metadata with empty inputs", () => {
    const result = parsedTemplateSchema.safeParse({
      metadata: { id: "onyx", name: "Onyx", sidebarPosition: "none" },
      inputs: [],
      files: { "index.html": "<html></html>" },
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @reactive-resume/schema test -- src/template-metadata.test.ts
```

Expected: FAIL — `Cannot find module './template-metadata'`

- [ ] **Step 3: Write `template-metadata.ts`**

```typescript
// packages/schema/src/template-metadata.ts
import z from "zod";

export const fontDeclarationSchema = z.object({
  family: z.string().min(1),
  weights: z.array(z.number().int().positive()),
  source: z.enum(["bundled", "google"]),
  files: z.record(z.string()).optional(),
});

export type FontDeclaration = z.infer<typeof fontDeclarationSchema>;

export const typographySlotSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  defaultFont: z.string().optional(),
  defaultSize: z.number().positive().optional(),
  defaultWeight: z.number().int().positive().optional(),
  defaultLineHeight: z.number().positive().optional(),
});

export type TypographySlot = z.infer<typeof typographySlotSchema>;

export const templateMetadataSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  author: z.string().optional(),
  description: z.string().optional(),
  sidebarPosition: z.enum(["left", "right", "none", "either"]),
  tags: z.array(z.string()).catch([]),
  fonts: z.array(fontDeclarationSchema).catch([]),
  typography: z.array(typographySlotSchema).catch([]),
});

export type TemplateMetadata = z.infer<typeof templateMetadataSchema>;

export const resumeSlotInputTypeSchema = z.enum([
  "rich-text",
  "text",
  "image",
  "image-list",
  "url",
  "toggle",
]);

export type ResumeSlotInputType = z.infer<typeof resumeSlotInputTypeSchema>;

export const resumeSlotItemTypeSchema = z.enum([
  "experienceItem",
  "educationItem",
  "projectItem",
  "skillItem",
  "certificationItem",
  "awardItem",
  "publicationItem",
  "volunteerItem",
  "referenceItem",
  "languageItem",
  "interestItem",
]);

export type ResumeSlotItemType = z.infer<typeof resumeSlotItemTypeSchema>;

export const resumeSlotSchema = z.object({
  id: z.string().min(1),
  itemType: resumeSlotItemTypeSchema,
  type: resumeSlotInputTypeSchema,
  label: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().catch(false),
});

export type ResumeSlot = z.infer<typeof resumeSlotSchema>;

export const parsedTemplateSchema = z.object({
  metadata: templateMetadataSchema,
  inputs: z.array(resumeSlotSchema),
  files: z.record(z.string()),
});

export type ParsedTemplate = z.infer<typeof parsedTemplateSchema> & {
  warnings: Array<{ type: string; message: string }>;
};
```

- [ ] **Step 4: Update `packages/schema/src/resume/data.ts` — add `typography.slots` and `layout.sidebarPosition`**

Find `typographySchema` (around line 489) and extend it:

```typescript
// packages/schema/src/resume/data.ts

export const typographySlotValueSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize:   z.number().optional(),
  fontWeight: z.number().int().optional(),
  lineHeight: z.number().optional(),
});

export type TypographySlotValue = z.infer<typeof typographySlotValueSchema>;

export const typographySchema = z.object({
  body:    typographyItemSchema.describe("The typography for the body of the resume."),
  heading: typographyItemSchema.describe("The typography for the headings of the resume."),
  slots: z
    .record(typographySlotValueSchema)
    .catch({})
    .describe("User overrides per template-declared typography slot, keyed by slot id."),
});
```

Find `layoutSchema` (around line 437) and add `sidebarPosition`:

```typescript
export const layoutSchema = z.object({
  sidebarWidth: z
    .number()
    .min(10)
    .max(50)
    .catch(35)
    .describe("The width of the sidebar column, defined as a percentage of the page width."),
  pages: z.array(pageLayoutSchema).describe("The pages to display in the layout."),
  sidebarPosition: z
    .enum(["left", "right"])
    .optional()
    .describe("User's sidebar direction override. Only used when the active template declares sidebarPosition: 'either'."),
});
```

- [ ] **Step 5: Write tests for the metadata schema changes**

Add these two describe blocks to `packages/schema/src/resume/data.test.ts`:

```typescript
// append to packages/schema/src/resume/data.test.ts
import { layoutSchema, typographySchema } from "./data";

describe("typographySchema — slots", () => {
  it("defaults slots to empty object when absent", () => {
    const result = typographySchema.safeParse({
      body:    { fontFamily: "IBM Plex Serif", fontWeights: ["400"], fontSize: 10, lineHeight: 1.5 },
      heading: { fontFamily: "IBM Plex Serif", fontWeights: ["600"], fontSize: 14, lineHeight: 1.5 },
    });
    expect(result.success).toBe(true);
    expect(result.data?.slots).toEqual({});
  });

  it("accepts slot overrides", () => {
    const result = typographySchema.safeParse({
      body:    { fontFamily: "Inter", fontWeights: ["400"], fontSize: 10, lineHeight: 1.5 },
      heading: { fontFamily: "Inter", fontWeights: ["600"], fontSize: 14, lineHeight: 1.5 },
      slots: {
        name:    { fontFamily: "Playfair Display", fontSize: 28, fontWeight: 700 },
        caption: { fontSize: 8.5 },
      },
    });
    expect(result.success).toBe(true);
    expect(result.data?.slots.name?.fontFamily).toBe("Playfair Display");
    expect(result.data?.slots.caption?.fontSize).toBe(8.5);
  });
});

describe("layoutSchema — sidebarPosition", () => {
  it("defaults sidebarPosition to undefined when absent", () => {
    const result = layoutSchema.safeParse({
      sidebarWidth: 35,
      pages: [{ fullWidth: false, main: ["experience"], sidebar: [] }],
    });
    expect(result.success).toBe(true);
    expect(result.data?.sidebarPosition).toBeUndefined();
  });

  it("accepts sidebarPosition left or right", () => {
    for (const pos of ["left", "right"] as const) {
      const result = layoutSchema.safeParse({
        sidebarWidth: 35,
        pages: [],
        sidebarPosition: pos,
      });
      expect(result.success).toBe(true);
      expect(result.data?.sidebarPosition).toBe(pos);
    }
  });
});
```

Run test to verify it fails:

```bash
pnpm --filter @reactive-resume/schema test -- src/resume/data.test.ts
```

Expected: FAIL — `slots` and `sidebarPosition` not yet on the schemas

After adding the schema changes, run again:

```bash
pnpm --filter @reactive-resume/schema test -- src/resume/data.test.ts
```

Expected: PASS

- [ ] **Step 6: Run template-metadata tests**

```bash
pnpm --filter @reactive-resume/schema test -- src/template-metadata.test.ts
```

Expected: PASS (all tests)

- [ ] **Step 7: Typecheck**

```bash
pnpm --filter @reactive-resume/schema typecheck
```

Expected: no errors

- [ ] **Step 8: Add `./template-metadata` export to `packages/schema/package.json`**

Find the `"exports"` map and add:

```json
"./template-metadata": "./src/template-metadata.ts"
```

- [ ] **Step 9: Commit**

```bash
git add packages/schema/src/template-metadata.ts packages/schema/src/template-metadata.test.ts packages/schema/src/resume/data.ts packages/schema/src/resume/data.test.ts packages/schema/package.json
git commit -m "feat(schema): add fontDeclarationSchema, typographySlotSchema, templateMetadataSchema, resumeSlotSchema, parsedTemplateSchema; add typography.slots + layout.sidebarPosition to resume metadata"
```

---

## Task 3: Bootstrap `packages/renderer`

**Files:**
- Create: `packages/renderer/package.json`
- Create: `packages/renderer/tsconfig.json`
- Create: `packages/renderer/turbo.json`
- Create: `packages/renderer/vitest.config.ts`
- Create: `packages/renderer/src/index.ts`

- [ ] **Step 1: Create `packages/renderer/package.json`**

```json
{
  "name": "@reactive-resume/renderer",
  "version": "0.0.0",
  "type": "module",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsgo --noEmit",
    "test": "vitest run --passWithNoTests",
    "test:coverage": "vitest run --coverage --passWithNoTests",
    "test:ci": "vitest run --coverage --reporter=default --reporter=github-actions --reporter=json --reporter=junit --outputFile.json=reports/vitest-results.json --outputFile.junit=reports/vitest-junit.xml --passWithNoTests",
    "test:agent": "vitest run --reporter=agent --reporter=json --outputFile.json=reports/vitest-results.json --passWithNoTests"
  },
  "dependencies": {
    "@reactive-resume/schema": "workspace:*",
    "jszip": "^3.10.1",
    "node-html-parser": "^7.1.0",
    "nunjucks": "^3.2.4"
  },
  "devDependencies": {
    "@reactive-resume/config": "workspace:*",
    "@types/nunjucks": "^3.2.6",
    "@typescript/native-preview": "7.0.0-dev.20260519.1",
    "typescript": "^6.0.3",
    "vitest": "^4.1.7"
  }
}
```

- [ ] **Step 2: Create `packages/renderer/tsconfig.json`**

```json
{
  "extends": "@reactive-resume/config/tsconfig.base.json"
}
```

- [ ] **Step 3: Create `packages/renderer/turbo.json`**

```json
{
  "extends": ["//"],
  "tags": ["runtime:universal", "role:rendering"]
}
```

- [ ] **Step 4: Create `packages/renderer/vitest.config.ts`**

```typescript
import { fileURLToPath } from "node:url";
// @boundaries-ignore root shared Vitest config
import { createVitestProjectConfig } from "../../vitest.shared";

export default createVitestProjectConfig({
  name: "@reactive-resume/renderer",
  dirname: fileURLToPath(new URL(".", import.meta.url)),
});
```

- [ ] **Step 5: Create `packages/renderer/src/index.ts`**

```typescript
export { render } from "./render";
export { parseTemplate, TemplateParseError } from "./parse-template";
export { buildInjectedStyles } from "./css-injection";
export { createEnvironment } from "./environment";
export { registerFilters } from "./filters";
export type { RenderContext } from "./render";
```

- [ ] **Step 6: Install dependencies**

```bash
pnpm install
```

- [ ] **Step 7: Verify package resolves**

```bash
pnpm --filter @reactive-resume/renderer typecheck 2>&1 | head -5
```

Expected: errors about missing source files — not about package resolution

- [ ] **Step 8: Commit**

```bash
git add packages/renderer/
git commit -m "feat(renderer): bootstrap @reactive-resume/renderer package with Nunjucks + jszip"
```

---

## Task 4: Custom Nunjucks filters

**Files:**
- Create: `packages/renderer/src/filters.ts`
- Create: `packages/renderer/src/filters.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/renderer/src/filters.test.ts
import { describe, expect, it } from "vitest";
import nunjucks from "nunjucks";
import { registerFilters } from "./filters";

const makeEnv = () => {
  const env = new nunjucks.Environment(null, { autoescape: true });
  registerFilters(env);
  return env;
};

describe("selectVisible filter", () => {
  it("keeps items where hidden is false", () => {
    const env = makeEnv();
    const result = env.renderString(
      "{% for item in items | selectVisible %}{{ item.name }},{% endfor %}",
      { items: [{ name: "A", hidden: false }, { name: "B", hidden: true }, { name: "C", hidden: false }] },
    );
    expect(result).toBe("A,C,");
  });

  it("returns empty when all items are hidden", () => {
    const env = makeEnv();
    const result = env.renderString(
      "{% for item in items | selectVisible %}{{ item.name }}{% endfor %}",
      { items: [{ name: "A", hidden: true }] },
    );
    expect(result).toBe("");
  });

  it("handles non-array input gracefully", () => {
    const env = makeEnv();
    const result = env.renderString(
      "{% for item in val | selectVisible %}x{% endfor %}",
      { val: null },
    );
    expect(result).toBe("");
  });
});

describe("levelDots filter", () => {
  it("renders 5 dot spans", () => {
    const env = makeEnv();
    const result = env.renderString("{{ level | levelDots }}", { level: 3 });
    expect(result.match(/<span/g)?.length).toBe(5);
  });

  it("clamps values above 5", () => {
    const env = makeEnv();
    const result = env.renderString("{{ level | levelDots }}", { level: 10 });
    expect(result.match(/<span/g)?.length).toBe(5);
  });

  it("handles non-number input", () => {
    const env = makeEnv();
    expect(() => env.renderString("{{ level | levelDots }}", { level: "high" })).not.toThrow();
  });
});

describe("formatDate filter", () => {
  it("passes through string dates unchanged", () => {
    const env = makeEnv();
    const result = env.renderString("{{ date | formatDate }}", { date: "July 2024" });
    expect(result).toBe("July 2024");
  });

  it("returns empty string for empty input", () => {
    const env = makeEnv();
    const result = env.renderString("{{ date | formatDate }}", { date: "" });
    expect(result).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @reactive-resume/renderer test -- src/filters.test.ts
```

Expected: FAIL — `Cannot find module './filters'`

- [ ] **Step 3: Write `filters.ts`**

```typescript
// packages/renderer/src/filters.ts
import nunjucks from "nunjucks";
import type { Environment } from "nunjucks";

export const registerFilters = (env: Environment): void => {
  env.addFilter("selectVisible", (items: unknown) => {
    if (!Array.isArray(items)) return [];
    return items.filter((item) => item && typeof item === "object" && !("hidden" in item && item.hidden));
  });

  env.addFilter("levelDots", (level: unknown) => {
    const n = typeof level === "number" ? Math.min(5, Math.max(0, Math.round(level))) : 0;
    const html = Array.from({ length: 5 }, (_, i) => {
      const filled = i < n;
      return `<span style="display:inline-block;width:0.55em;height:0.55em;border-radius:50%;margin-right:0.15em;background-color:${filled ? "var(--resume-primary)" : "transparent"};border:1px solid var(--resume-primary);"></span>`;
    }).join("");
    return new nunjucks.runtime.SafeString(html);
  });

  env.addFilter("formatDate", (date: unknown) => {
    if (typeof date !== "string" || !date) return "";
    return date;
  });
};
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @reactive-resume/renderer test -- src/filters.test.ts
```

Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/filters.ts packages/renderer/src/filters.test.ts
git commit -m "feat(renderer): add custom Nunjucks filters (selectVisible, levelDots, formatDate)"
```

---

## Task 5: Nunjucks custom loader

**Files:**
- Create: `packages/renderer/src/loader.ts`
- Create: `packages/renderer/src/loader.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/renderer/src/loader.test.ts
import { describe, expect, it } from "vitest";
import nunjucks from "nunjucks";
import { FileMapLoader } from "./loader";

const files = {
  "index.html": "<p>Hello</p>",
  "sections/experience.html": "<section>Experience</section>",
};

describe("FileMapLoader", () => {
  it("resolves a known file", () => {
    const loader = new FileMapLoader(files);
    const src = loader.getSource("index.html");
    expect(src).not.toBeNull();
    expect(src?.src).toBe("<p>Hello</p>");
  });

  it("resolves a file in a subdirectory", () => {
    const loader = new FileMapLoader(files);
    const src = loader.getSource("sections/experience.html");
    expect(src?.src).toBe("<section>Experience</section>");
  });

  it("returns null for an unknown file", () => {
    const loader = new FileMapLoader(files);
    const src = loader.getSource("sections/awards.html");
    expect(src).toBeNull();
  });

  it("resolves dynamic include paths in a real Nunjucks render", () => {
    const loader = new FileMapLoader({
      "index.html": '{% include "sections/" + sectionId + ".html" ignore missing %}',
      "sections/experience.html": "<p>Experience</p>",
    });
    const env = new nunjucks.Environment(loader, { autoescape: false });
    const result = env.render("index.html", { sectionId: "experience" });
    expect(result).toContain("<p>Experience</p>");
  });

  it("silently skips missing includes when ignore missing is used", () => {
    const loader = new FileMapLoader({ "index.html": '{% include "sections/awards.html" ignore missing %}' });
    const env = new nunjucks.Environment(loader, { autoescape: false });
    expect(() => env.render("index.html", {})).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @reactive-resume/renderer test -- src/loader.test.ts
```

Expected: FAIL — `Cannot find module './loader'`

- [ ] **Step 3: Write `loader.ts`**

```typescript
// packages/renderer/src/loader.ts
import nunjucks from "nunjucks";

export class FileMapLoader extends nunjucks.Loader {
  async = false as const;

  constructor(private readonly files: Record<string, string>) {
    super();
  }

  getSource(name: string): nunjucks.LoaderSource | null {
    const content = this.files[name];
    if (content !== undefined) {
      return { src: content, path: name, noCache: false };
    }

    // For section files not in the archive, fall back to sections/default.html.
    // This lets custom sections (whose IDs are UUIDs) render generically.
    if (name.startsWith("sections/") && name.endsWith(".html")) {
      const fallback = this.files["sections/default.html"];
      if (fallback !== undefined) {
        return { src: fallback, path: "sections/default.html", noCache: false };
      }
    }

    return null;
  }
}
```

- [ ] **Step 4: Add a fallback test to `loader.test.ts`**

Add this test to `packages/renderer/src/loader.test.ts`:

```typescript
  it("falls back to sections/default.html for unknown section files", () => {
    const loader = new FileMapLoader({
      "index.html": "<p>Main</p>",
      "sections/default.html": "<p>Default section</p>",
    });
    const src = loader.getSource("sections/custom-uuid-123.html");
    expect(src).not.toBeNull();
    expect(src?.src).toBe("<p>Default section</p>");
    expect(src?.path).toBe("sections/default.html");
  });

  it("returns null for unknown section file when no default.html exists", () => {
    const loader = new FileMapLoader({ "index.html": "<p>Main</p>" });
    const src = loader.getSource("sections/custom-uuid-123.html");
    expect(src).toBeNull();
  });
```

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @reactive-resume/renderer test -- src/loader.test.ts
```

Expected: PASS (7 tests)

- [ ] **Step 6: Commit**

```bash
git add packages/renderer/src/loader.ts packages/renderer/src/loader.test.ts
git commit -m "feat(renderer): add FileMapLoader — resolves includes from file map, falls back to sections/default.html for custom sections"
```

---

## Task 6: Nunjucks environment factory

**Files:**
- Create: `packages/renderer/src/environment.ts`

- [ ] **Step 1: Write `environment.ts`**

```typescript
// packages/renderer/src/environment.ts
import nunjucks from "nunjucks";
import { FileMapLoader } from "./loader";
import { registerFilters } from "./filters";

export const createEnvironment = (files: Record<string, string>): nunjucks.Environment => {
  const env = new nunjucks.Environment(new FileMapLoader(files), {
    autoescape: true,
    trimBlocks: true,
    lstripBlocks: true,
  });

  registerFilters(env);

  return env;
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/renderer/src/environment.ts
git commit -m "feat(renderer): add Nunjucks environment factory with FileMapLoader"
```

---

## Task 7: CSS vars + font-face injection

**Files:**
- Create: `packages/renderer/src/css-injection.ts`
- Create: `packages/renderer/src/css-injection.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/renderer/src/css-injection.test.ts
import { describe, expect, it } from "vitest";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { TemplateMetadata } from "@reactive-resume/schema/template-metadata";
import { buildInjectedStyles } from "./css-injection";

const makeData = (overrides: Partial<ResumeData["metadata"]> = {}): ResumeData =>
  ({
    basics: { name: "A", headline: "", email: "", phone: "", location: "", website: { url: "", label: "" }, customFields: [] },
    picture: { hidden: true, url: "", size: 64, rotation: 0, aspectRatio: 1, borderRadius: 0, borderColor: "", borderWidth: 0, shadowColor: "", shadowWidth: 0 },
    summary: { title: "", columns: 1, hidden: false, content: "" },
    sections: {} as ResumeData["sections"],
    customSections: [],
    metadata: {
      template: "test",
      layout: { sidebarWidth: 35, pages: [] },
      page: { gapX: 4, gapY: 6, marginX: 14, marginY: 12, format: "a4", locale: "en-US", hideIcons: false },
      design: { colors: { primary: "rgba(220,38,38,1)", text: "rgba(0,0,0,1)", background: "rgba(255,255,255,1)" }, level: { icon: "", type: "circle" } },
      typography: {
        body:    { fontFamily: "Inter", fontWeights: ["400"], fontSize: 10, lineHeight: 1.5 },
        heading: { fontFamily: "Inter", fontWeights: ["600"], fontSize: 14, lineHeight: 1.5 },
        slots: {},
      },
      notes: "",
      ...overrides,
    },
  }) as unknown as ResumeData;

const noneTemplate: TemplateMetadata = {
  id: "test", name: "Test", sidebarPosition: "none", tags: [], fonts: [], typography: [],
};

const leftTemplate: TemplateMetadata = {
  id: "khaled", name: "Khaled", sidebarPosition: "left", tags: [], fonts: [], typography: [],
};

const eitherTemplate: TemplateMetadata = {
  id: "khaled", name: "Khaled", sidebarPosition: "either", tags: [], fonts: [],
  typography: [
    { id: "name", label: "Your name", defaultFont: "Playfair Display", defaultSize: 28, defaultWeight: 700 },
  ],
};

describe("buildInjectedStyles — @page", () => {
  it("injects @page A4 for a4 format", () => {
    const out = buildInjectedStyles(makeData(), noneTemplate, "test", "http://localhost:3001");
    expect(out).toContain("size: A4");
  });

  it("injects @page letter for letter format", () => {
    const data = makeData({ page: { gapX: 4, gapY: 6, marginX: 14, marginY: 12, format: "letter", locale: "en-US", hideIcons: false } } as any);
    const out = buildInjectedStyles(data, noneTemplate, "test", "http://localhost:3001");
    expect(out).toContain("size: letter");
  });
});

describe("buildInjectedStyles — CSS vars", () => {
  it("injects primary color", () => {
    const out = buildInjectedStyles(makeData(), noneTemplate, "test", "http://localhost:3001");
    expect(out).toContain("--resume-primary: rgba(220,38,38,1)");
  });

  it("injects page padding from marginX/marginY", () => {
    const out = buildInjectedStyles(makeData(), noneTemplate, "test", "http://localhost:3001");
    expect(out).toContain("--resume-page-padding-x: 14pt");
    expect(out).toContain("--resume-page-padding-y: 12pt");
  });

  it("injects body typography slot vars", () => {
    const out = buildInjectedStyles(makeData(), noneTemplate, "test", "http://localhost:3001");
    expect(out).toContain('--resume-font-body: "Inter"');
    expect(out).toContain("--resume-size-body: 10pt");
    expect(out).toContain("--resume-weight-body: 400");
  });

  it("does not inject sidebar vars when sidebarPosition is none", () => {
    const out = buildInjectedStyles(makeData(), noneTemplate, "test", "http://localhost:3001");
    expect(out).not.toContain("--resume-sidebar-grid-areas");
  });

  it("injects sidebar-left vars for left template", () => {
    const out = buildInjectedStyles(makeData(), leftTemplate, "khaled", "http://localhost:3001");
    expect(out).toContain('"sidebar main"');
    expect(out).toContain("var(--resume-sidebar-width) 1fr");
  });

  it("uses user sidebarPosition override for either template", () => {
    const data = makeData({ layout: { sidebarWidth: 35, pages: [], sidebarPosition: "right" } } as any);
    const out = buildInjectedStyles(data, eitherTemplate, "khaled", "http://localhost:3001");
    expect(out).toContain('"main sidebar"');
    expect(out).toContain("1fr var(--resume-sidebar-width)");
  });

  it("defaults to left when either template has no user override", () => {
    const out = buildInjectedStyles(makeData(), eitherTemplate, "khaled", "http://localhost:3001");
    expect(out).toContain('"sidebar main"');
  });

  it("injects extra typography slot vars from template declaration", () => {
    const out = buildInjectedStyles(makeData(), eitherTemplate, "khaled", "http://localhost:3001");
    expect(out).toContain("--resume-font-name");
    expect(out).toContain("--resume-size-name: 28pt");
    expect(out).toContain("--resume-weight-name: 700");
  });

  it("user slot override takes priority over template default", () => {
    const data = makeData({
      typography: {
        body:    { fontFamily: "Inter", fontWeights: ["400"], fontSize: 10, lineHeight: 1.5 },
        heading: { fontFamily: "Inter", fontWeights: ["600"], fontSize: 14, lineHeight: 1.5 },
        slots: { name: { fontFamily: "Roboto", fontSize: 24 } },
      } as any,
    });
    const out = buildInjectedStyles(data, eitherTemplate, "khaled", "http://localhost:3001");
    expect(out).toContain('--resume-font-name: "Roboto"');
    expect(out).toContain("--resume-size-name: 24pt");
  });
});

describe("buildInjectedStyles — fonts", () => {
  it("generates @font-face for bundled fonts", () => {
    const tmpl: TemplateMetadata = {
      id: "khaled", name: "Khaled", sidebarPosition: "none", tags: [],
      fonts: [{ family: "Playfair Display", weights: [400, 700], source: "bundled", files: { "400": "fonts/pf-400.woff2", "700": "fonts/pf-700.woff2" } }],
      typography: [],
    };
    const out = buildInjectedStyles(makeData(), tmpl, "khaled", "http://localhost:3001");
    expect(out).toContain('@font-face');
    expect(out).toContain('"Playfair Display"');
    expect(out).toContain("http://localhost:3001/api/templates/khaled/fonts/fonts/pf-400.woff2");
  });

  it("generates Google Fonts link for google fonts", () => {
    const tmpl: TemplateMetadata = {
      id: "test", name: "Test", sidebarPosition: "none", tags: [],
      fonts: [{ family: "Inter", weights: [400, 600], source: "google" }],
      typography: [],
    };
    const out = buildInjectedStyles(makeData(), tmpl, "test", "http://localhost:3001");
    expect(out).toContain('href="https://fonts.googleapis.com');
    expect(out).toContain("Inter");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @reactive-resume/renderer test -- src/css-injection.test.ts
```

Expected: FAIL — `Cannot find module './css-injection'`

- [ ] **Step 3: Write `css-injection.ts`**

```typescript
// packages/renderer/src/css-injection.ts
import type { ResumeData, Layout } from "@reactive-resume/schema/resume/data";
import type { TemplateMetadata, TypographySlot } from "@reactive-resume/schema/template-metadata";

const joinFont = (fontFamily: string): string => `"${fontFamily}"`;

const parseWeight = (w: string | undefined, fallback: number): number => {
  const n = parseInt(w ?? String(fallback), 10);
  return Number.isNaN(n) ? fallback : n;
};

const buildPageRule = (format: string): string => {
  const size = format === "letter" ? "letter" : format === "free-form" ? "auto" : "A4";
  return `  @page {\n    size: ${size};\n    margin: 0;\n  }`;
};

const buildFontFaceBlock = (metadata: TemplateMetadata, templateId: string, baseUrl: string): string => {
  const declarations = metadata.fonts.flatMap((font) => {
    if (font.source === "google") return [];
    return Object.entries(font.files ?? {}).map(
      ([weight, path]) =>
        `@font-face {\n  font-family: ${JSON.stringify(font.family)};\n  font-weight: ${weight};\n  src: url(${JSON.stringify(`${baseUrl}/api/templates/${templateId}/fonts/${path}`)}) format("woff2");\n}`,
    );
  });
  if (declarations.length === 0) return "";
  return `<style id="resume-fonts">\n${declarations.join("\n")}\n</style>`;
};

const buildGoogleFontsLink = (metadata: TemplateMetadata): string => {
  const googleFonts = metadata.fonts.filter((f) => f.source === "google");
  if (googleFonts.length === 0) return "";
  const families = googleFonts
    .map((f) => `${f.family.replace(/ /g, "+")}:wght@${f.weights.join(";")}`)
    .join("&family=");
  return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${families}&display=swap" />`;
};

const slotLine = (id: string, font: string, size: number, weight: number, lineHeight: number): string =>
  `  --resume-font-${id}: ${joinFont(font)};\n  --resume-size-${id}: ${size}pt;\n  --resume-weight-${id}: ${weight};\n  --resume-line-height-${id}: ${lineHeight};`;

const buildTypographySlotVars = (templateMetadata: TemplateMetadata, data: ResumeData): string => {
  const { typography } = data.metadata;
  const userSlots = (typography as typeof typography & { slots: Record<string, { fontFamily?: string; fontSize?: number; fontWeight?: number; lineHeight?: number }> }).slots ?? {};

  const bodyWeight  = parseWeight(typography.body.fontWeights[0],   400);
  const headWeight  = parseWeight(typography.heading.fontWeights.at(-1), 600);

  const builtinLines = [
    slotLine("body",    typography.body.fontFamily,    typography.body.fontSize,    bodyWeight, typography.body.lineHeight),
    slotLine("heading", typography.heading.fontFamily, typography.heading.fontSize, headWeight, typography.heading.lineHeight),
  ];

  const extraSlots = (templateMetadata.typography ?? []).filter((s) => s.id !== "body" && s.id !== "heading");
  const extraLines = extraSlots.map((slot: TypographySlot) => {
    const u = userSlots[slot.id] ?? {};
    const font       = u.fontFamily  ?? slot.defaultFont       ?? typography.body.fontFamily;
    const size       = u.fontSize    ?? slot.defaultSize       ?? typography.body.fontSize;
    const weight     = u.fontWeight  ?? slot.defaultWeight     ?? bodyWeight;
    const lineHeight = u.lineHeight  ?? slot.defaultLineHeight ?? typography.body.lineHeight;
    return slotLine(slot.id, font, size, weight, lineHeight);
  });

  return [...builtinLines, ...extraLines].join("\n");
};

const buildSidebarVars = (templateMetadata: TemplateMetadata, data: ResumeData): string => {
  const { sidebarPosition } = templateMetadata;
  if (sidebarPosition === "none") return "";
  const layout = data.metadata.layout as Layout & { sidebarPosition?: "left" | "right" };
  const side = sidebarPosition === "either" ? (layout.sidebarPosition ?? "left") : sidebarPosition;
  const areas   = side === "right" ? '"main sidebar"'               : '"sidebar main"';
  const columns = side === "right" ? "1fr var(--resume-sidebar-width)" : "var(--resume-sidebar-width) 1fr";
  return `  --resume-sidebar-grid-areas: ${areas};\n  --resume-sidebar-grid-columns: ${columns};`;
};

export const buildInjectedStyles = (
  data: ResumeData,
  templateMetadata: TemplateMetadata,
  templateId: string,
  baseUrl: string,
): string => {
  const { design, page } = data.metadata;
  const sidebarWidth = data.metadata.layout.sidebarWidth ?? 35;

  const fontFaceBlock  = buildFontFaceBlock(templateMetadata, templateId, baseUrl);
  const googleFontsLink = buildGoogleFontsLink(templateMetadata);
  const typographyVars = buildTypographySlotVars(templateMetadata, data);
  const sidebarVars    = buildSidebarVars(templateMetadata, data);
  const pageRule       = buildPageRule(page.format);

  const cssVarsBlock = `<style id="resume-css-vars">
${pageRule}

  :root {
  --resume-primary: ${design.colors.primary};
  --resume-foreground: ${design.colors.text};
  --resume-background: ${design.colors.background};
  --resume-page-padding-x: ${page.marginX}pt;
  --resume-page-padding-y: ${page.marginY}pt;
  --resume-sidebar-width: ${sidebarWidth}%;
${sidebarVars ? `${sidebarVars}\n` : ""}  --resume-section-gap: ${page.gapY}pt;
  --resume-column-gap: ${page.gapX}pt;
${typographyVars}
}
</style>`;

  return [googleFontsLink, fontFaceBlock, cssVarsBlock].filter(Boolean).join("\n");
};
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @reactive-resume/renderer test -- src/css-injection.test.ts
```

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/css-injection.ts packages/renderer/src/css-injection.test.ts
git commit -m "feat(renderer): add CSS vars + @font-face + @page injection from ResumeData and TemplateMetadata"
```

---

## Task 8: `render()` function

**Files:**
- Create: `packages/renderer/src/render.ts`
- Create: `packages/renderer/src/render.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/renderer/src/render.test.ts
import { describe, expect, it } from "vitest";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { TemplateMetadata } from "@reactive-resume/schema/template-metadata";
import { render } from "./render";

const minimalFiles: Record<string, string> = {
  "index.html": `<!DOCTYPE html>
<html>
<head></head>
<body>
<h1>{{ basics.name }}</h1>
{% for page in metadata.layout.pages %}
  {% for sectionId in page.main %}
    {% include "sections/" + sectionId + ".html" ignore missing %}
  {% endfor %}
{% endfor %}
</body>
</html>`,
  "sections/experience.html": `<section>
<h2>{{ sections.experience.title }}</h2>
{% for item in sections.experience.items | selectVisible %}
<div class="exp">
  <strong>{{ item.company }}</strong>
  {{ item.description | safe }}
  {% if item.extensions.additionalHtml %}{{ item.extensions.additionalHtml | safe }}{% endif %}
  <resume-slot id="additionalHtml" item-type="experienceItem" type="rich-text" label="Additional section" />
</div>
{% endfor %}
</section>`,
};

const minimalMetadata: TemplateMetadata = {
  id: "test",
  name: "Test",
  sidebarPosition: "none",
  tags: [],
  fonts: [],
  typography: [],
};

const makeData = (): ResumeData => ({
  basics: {
    name: "Khaled AbuShqear",
    headline: "Infrastructure Engineer",
    email: "q@example.com",
    phone: "",
    location: "",
    website: { url: "", label: "" },
    customFields: [],
  },
  picture: { hidden: true, url: "", size: 64, rotation: 0, aspectRatio: 1, borderRadius: 0, borderColor: "rgba(0,0,0,0)", borderWidth: 0, shadowColor: "rgba(0,0,0,0)", shadowWidth: 0 },
  summary: { title: "", columns: 1, hidden: false, content: "" },
  sections: {
    experience: {
      title: "Experience",
      columns: 1,
      hidden: false,
      items: [
        {
          id: "exp-1",
          hidden: false,
          company: "Careem",
          position: "Infrastructure Engineer",
          location: "Dubai",
          period: "Feb 2023 – Present",
          website: { url: "", label: "", inlineLink: false },
          description: "<p>Built platform infrastructure.</p>",
          roles: [],
          extensions: { additionalHtml: "<p>Extra content.</p>" },
        },
        {
          id: "exp-2",
          hidden: true,
          company: "Hidden Corp",
          position: "Engineer",
          location: "",
          period: "",
          website: { url: "", label: "", inlineLink: false },
          description: "",
          roles: [],
          extensions: {},
        },
      ],
    },
  },
  customSections: [],
  metadata: {
    template: "test",
    layout: { pages: [{ main: ["experience"], sidebar: [], fullWidth: false }], sidebarWidth: 35 },
    page: { format: "a4", gapX: 4, gapY: 6, marginX: 14, marginY: 12, locale: "en-US", hideIcons: false },
    design: { colors: { primary: "rgba(220,38,38,1)", text: "rgba(0,0,0,1)", background: "rgba(255,255,255,1)" }, level: { icon: "", type: "circle" } },
    typography: {
      body:    { fontFamily: "IBM Plex Serif", fontSize: 10, fontWeights: ["400", "500"], lineHeight: 1.5 },
      heading: { fontFamily: "IBM Plex Serif", fontSize: 14, fontWeights: ["600"],        lineHeight: 1.5 },
      slots: {},
    },
    notes: "",
  },
}) as unknown as ResumeData;

describe("render", () => {
  it("outputs basics.name in the HTML", () => {
    const html = render(minimalFiles, makeData(), minimalMetadata, "test", "http://localhost:3001");
    expect(html).toContain("Khaled AbuShqear");
  });

  it("strips <resume-slot> tags from output", () => {
    const html = render(minimalFiles, makeData(), minimalMetadata, "test", "http://localhost:3001");
    expect(html).not.toContain("<resume-slot");
  });

  it("injects CSS custom properties block", () => {
    const html = render(minimalFiles, makeData(), minimalMetadata, "test", "http://localhost:3001");
    expect(html).toContain("--resume-primary");
    expect(html).toContain("--resume-sidebar-width");
  });

  it("renders HTML description fields as HTML via safe filter", () => {
    const html = render(minimalFiles, makeData(), minimalMetadata, "test", "http://localhost:3001");
    expect(html).toContain("<p>Built platform infrastructure.</p>");
  });

  it("renders extension values", () => {
    const html = render(minimalFiles, makeData(), minimalMetadata, "test", "http://localhost:3001");
    expect(html).toContain("<p>Extra content.</p>");
  });

  it("filters hidden items via selectVisible", () => {
    const html = render(minimalFiles, makeData(), minimalMetadata, "test", "http://localhost:3001");
    expect(html).not.toContain("Hidden Corp");
    expect(html).toContain("Careem");
  });

  it("dispatches sections via layout pages", () => {
    const html = render(minimalFiles, makeData(), minimalMetadata, "test", "http://localhost:3001");
    expect(html).toContain("Careem");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @reactive-resume/renderer test -- src/render.test.ts
```

Expected: FAIL — `Cannot find module './render'`

- [ ] **Step 3: Write `render.ts`**

```typescript
// packages/renderer/src/render.ts
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { TemplateMetadata } from "@reactive-resume/schema/template-metadata";
import { buildInjectedStyles } from "./css-injection";
import { createEnvironment } from "./environment";

const RESUME_SLOT_RE = /<resume-slot\b[^>]*\/>/gi;

export type RenderContext = {
  basics: ResumeData["basics"];
  picture: ResumeData["picture"];
  summary: ResumeData["summary"];
  sections: ResumeData["sections"];
  customSections: ResumeData["customSections"];
  // Merged lookup of all sections by ID (standard type names + custom UUIDs).
  // Use sectionById[sectionId] in sections/default.html instead of sections[sectionId].
  sectionById: Record<string, unknown>;
  metadata: ResumeData["metadata"];
};

const buildContext = (data: ResumeData): RenderContext => ({
  basics: data.basics,
  picture: data.picture,
  summary: data.summary,
  sections: data.sections,
  customSections: data.customSections,
  sectionById: {
    ...(data.sections as Record<string, unknown>),
    ...Object.fromEntries(data.customSections.map((s) => [s.id, s])),
  },
  metadata: data.metadata,
});

/**
 * Renders a template file map with resume data.
 * - Strips <resume-slot> tags from all files before render
 * - Injects @font-face + CSS vars blocks before </head> in index.html
 * - Returns the complete rendered HTML string
 */
export const render = (
  files: Record<string, string>,
  data: ResumeData,
  templateMetadata: TemplateMetadata,
  templateId: string,
  baseUrl: string,
): string => {
  // Strip <resume-slot> tags from all files
  const cleanFiles = Object.fromEntries(
    Object.entries(files).map(([name, content]) => [name, content.replace(RESUME_SLOT_RE, "")]),
  );

  // Inject style blocks into index.html before </head>
  const injected = buildInjectedStyles(data, templateMetadata, templateId, baseUrl);
  if (injected && cleanFiles["index.html"]?.includes("</head>")) {
    cleanFiles["index.html"] = cleanFiles["index.html"].replace("</head>", `${injected}\n</head>`);
  }

  const env = createEnvironment(cleanFiles);
  return env.render("index.html", buildContext(data));
};
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @reactive-resume/renderer test -- src/render.test.ts
```

Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/render.ts packages/renderer/src/render.test.ts
git commit -m "feat(renderer): add render() — dispatches sections via layout pages, strips slots, injects styles"
```

---

## Task 9: `parseTemplate()` function

**Files:**
- Create: `packages/renderer/src/parse-template.ts`
- Create: `packages/renderer/src/parse-template.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/renderer/src/parse-template.test.ts
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { parseTemplate, TemplateParseError } from "./parse-template";

const validMeta = {
  id: "test",
  name: "Test",
  sidebarPosition: "none",
};

async function makeZip(files: Record<string, string>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("parseTemplate", () => {
  it("extracts metadata from template.json", async () => {
    const buf = await makeZip({
      "template.json": JSON.stringify(validMeta),
      "index.html": "<html><head></head><body></body></html>",
    });
    const result = await parseTemplate(buf);
    expect(result.metadata.id).toBe("test");
    expect(result.metadata.sidebarPosition).toBe("none");
  });

  it("returns empty inputs when no resume-slot tags", async () => {
    const buf = await makeZip({
      "template.json": JSON.stringify(validMeta),
      "index.html": "<html><head></head><body></body></html>",
    });
    const result = await parseTemplate(buf);
    expect(result.inputs).toEqual([]);
  });

  it("extracts resume-slot tags from section files", async () => {
    const buf = await makeZip({
      "template.json": JSON.stringify(validMeta),
      "index.html": "<html><head></head><body></body></html>",
      "sections/experience.html": `<resume-slot id="additionalHtml" item-type="experienceItem" type="rich-text" label="Additional section" />`,
    });
    const result = await parseTemplate(buf);
    expect(result.inputs).toHaveLength(1);
    expect(result.inputs[0]).toMatchObject({
      id: "additionalHtml",
      itemType: "experienceItem",
      type: "rich-text",
      label: "Additional section",
      required: false,
    });
  });

  it("includes all files in the returned files map", async () => {
    const buf = await makeZip({
      "template.json": JSON.stringify(validMeta),
      "index.html": "<html></html>",
      "sections/skills.html": "<p>Skills</p>",
    });
    const result = await parseTemplate(buf);
    expect(result.files["index.html"]).toBe("<html></html>");
    expect(result.files["sections/skills.html"]).toBe("<p>Skills</p>");
  });

  it("throws TemplateParseError when template.json is missing", async () => {
    const buf = await makeZip({ "index.html": "<html></html>" });
    await expect(parseTemplate(buf)).rejects.toThrow(TemplateParseError);
  });

  it("throws TemplateParseError when index.html is missing", async () => {
    const buf = await makeZip({ "template.json": JSON.stringify(validMeta) });
    await expect(parseTemplate(buf)).rejects.toThrow(TemplateParseError);
  });

  it("throws TemplateParseError when template.json has invalid JSON", async () => {
    const buf = await makeZip({
      "template.json": "not valid json",
      "index.html": "<html></html>",
    });
    await expect(parseTemplate(buf)).rejects.toThrow(TemplateParseError);
  });

  it("throws TemplateParseError when metadata fails schema validation", async () => {
    const buf = await makeZip({
      "template.json": JSON.stringify({ id: "test" }), // missing required name + sidebarPosition
      "index.html": "<html></html>",
    });
    await expect(parseTemplate(buf)).rejects.toThrow(TemplateParseError);
  });

  it("throws TemplateParseError when a resume-slot has an unknown item-type", async () => {
    const buf = await makeZip({
      "template.json": JSON.stringify(validMeta),
      "index.html": "<html></html>",
      "sections/experience.html": `<resume-slot id="f" item-type="unknownItem" type="text" label="F" />`,
    });
    await expect(parseTemplate(buf)).rejects.toThrow(TemplateParseError);
  });

  it("throws TemplateParseError for path traversal filenames", async () => {
    const buf = await makeZip({
      "template.json": JSON.stringify(validMeta),
      "index.html": "<html></html>",
      "../etc/passwd": "root:x:0:0",
    });
    await expect(parseTemplate(buf)).rejects.toThrow(TemplateParseError);
  });

  it("throws TemplateParseError for Nunjucks syntax errors (Layer 3)", async () => {
    const buf = await makeZip({
      "template.json": JSON.stringify(validMeta),
      "index.html": "<html>{% for item in %}</html>",  // broken Nunjucks
    });
    await expect(parseTemplate(buf)).rejects.toThrow(TemplateParseError);
  });

  it("throws TemplateParseError when dry-run render crashes (Layer 5)", async () => {
    const buf = await makeZip({
      "template.json": JSON.stringify(validMeta),
      "index.html": "{{ undefinedVar.deeply.nested.crash() }}",
    });
    await expect(parseTemplate(buf)).rejects.toThrow(TemplateParseError);
  });

  it("throws TemplateParseError when template contains script tag (Layer 6)", async () => {
    const buf = await makeZip({
      "template.json": JSON.stringify(validMeta),
      "index.html": `<html><head><script>alert(1)</script></head><body></body></html>`,
    });
    await expect(parseTemplate(buf)).rejects.toThrow(TemplateParseError);
  });

  it("emits sidebar-not-rendered warning when sidebar declared but not referenced", async () => {
    const buf = await makeZip({
      "template.json": JSON.stringify({ ...validMeta, sidebarPosition: "left" }),
      "index.html": "<html><body>{% for page in metadata.layout.pages %}{% for id in page.main %}{{ id }}{% endfor %}{% endfor %}</body></html>",
    });
    const result = await parseTemplate(buf);
    expect(result.warnings.some((w) => w.type === "sidebar-not-rendered")).toBe(true);
  });

  it("emits section-not-implemented warnings when sections have no file and no default.html", async () => {
    const buf = await makeZip({
      "template.json": JSON.stringify(validMeta),
      "index.html": "<html><body></body></html>",
    });
    const result = await parseTemplate(buf);
    expect(result.warnings.some((w) => w.type === "section-not-implemented")).toBe(true);
  });

  it("does not emit section-not-implemented when sections/default.html exists", async () => {
    const buf = await makeZip({
      "template.json": JSON.stringify(validMeta),
      "index.html": "<html><body></body></html>",
      "sections/default.html": "<p>{{ sectionId }}</p>",
    });
    const result = await parseTemplate(buf);
    expect(result.warnings.filter((w) => w.type === "section-not-implemented")).toHaveLength(0);
  });

  it("extracts binary font files as base64 strings", async () => {
    // Create a minimal valid WOFF2 magic-bytes buffer
    const woff2Magic = Buffer.from([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x00, 0x00]);
    const zip = new JSZip();
    zip.file("template.json", JSON.stringify({ ...validMeta, fonts: [{ family: "TestFont", weights: [400], source: "bundled", files: { "400": "fonts/test-400.woff2" } }] }));
    zip.file("index.html", "<html></html>");
    zip.file("fonts/test-400.woff2", woff2Magic);
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    const result = await parseTemplate(buf);
    // Font file stored as base64, not raw binary string
    expect(typeof result.files["fonts/test-400.woff2"]).toBe("string");
    expect(result.files["fonts/test-400.woff2"]).toBe(woff2Magic.toString("base64"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @reactive-resume/renderer test -- src/parse-template.test.ts
```

Expected: FAIL — `Cannot find module './parse-template'`

- [ ] **Step 3: Write `parse-template.ts`**

```typescript
// packages/renderer/src/parse-template.ts
import JSZip from "jszip";
import nunjucks from "nunjucks";
import { parse as parseHtml } from "node-html-parser";
import type { ParsedTemplate } from "@reactive-resume/schema/template-metadata";
import { parsedTemplateSchema, templateMetadataSchema } from "@reactive-resume/schema/template-metadata";
import { FileMapLoader } from "./loader";

export class TemplateParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateParseError";
  }
}

// Known standard section IDs — used for section-not-implemented warnings
const STANDARD_SECTION_IDS = new Set([
  "summary", "profiles", "experience", "education", "projects", "skills",
  "languages", "interests", "awards", "certifications", "publications",
  "volunteer", "references",
]);

const BINARY_EXTENSIONS = new Set([".woff2", ".woff", ".ttf", ".otf", ".png", ".jpg", ".jpeg", ".gif"]);

const extractSlots = (html: string): unknown[] => {
  const root = parseHtml(html);
  return root.querySelectorAll("resume-slot").map((el) => ({
    id: el.getAttribute("id") ?? "",
    itemType: el.getAttribute("item-type") ?? "",
    type: el.getAttribute("type") ?? "",
    label: el.getAttribute("label") ?? "",
    description: el.getAttribute("description") ?? undefined,
    required: el.getAttribute("required") === "true",
  }));
};

export const parseTemplate = async (zipBuffer: Buffer): Promise<ParsedTemplate> => {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBuffer);
  } catch {
    throw new TemplateParseError("File is not a valid zip archive.");
  }

  // Layer 1: structural — required files, no path traversal
  const metaFile = zip.file("template.json");
  if (!metaFile) throw new TemplateParseError("Missing required file: template.json");
  const indexFile = zip.file("index.html");
  if (!indexFile) throw new TemplateParseError("Missing required file: index.html");

  for (const name of Object.keys(zip.files)) {
    if (name.includes("..")) throw new TemplateParseError(`Path traversal detected: ${name}`);
  }

  // Extract all files — binary extensions as base64, others as text
  const files: Record<string, string> = {};
  for (const [name, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
    files[name] = await file.async(BINARY_EXTENSIONS.has(ext) ? "base64" : "string");
  }

  // Layer 2: schema — validate template.json
  let rawMeta: unknown;
  try {
    rawMeta = JSON.parse(files["template.json"] as string);
  } catch {
    throw new TemplateParseError("template.json contains invalid JSON.");
  }

  const metaResult = templateMetadataSchema.safeParse(rawMeta);
  if (!metaResult.success) {
    const err = metaResult.error.errors[0];
    throw new TemplateParseError(
      `template.json validation failed: ${err?.path.join(".") ?? "unknown"} — ${err?.message ?? "invalid"}`,
    );
  }

  // Layer 2 continued: validate bundled font files exist in archive
  for (const font of metaResult.data.fonts) {
    if (font.source === "bundled") {
      for (const [weight, path] of Object.entries(font.files ?? {})) {
        if (!(path in files)) {
          throw new TemplateParseError(
            `Font file missing: ${font.family} weight ${weight} declared at "${path}" not found in archive`,
          );
        }
      }
    }
  }

  // Layer 2 continued: extract and validate resume-slot tags
  const inputs: unknown[] = [];
  for (const [name, content] of Object.entries(files)) {
    if (name.endsWith(".html")) {
      inputs.push(...extractSlots(content as string));
    }
  }

  const result = parsedTemplateSchema.safeParse({ metadata: metaResult.data, inputs, files });
  if (!result.success) {
    const err = result.error.errors[0];
    throw new TemplateParseError(
      `Template validation failed: ${err?.path.join(".") ?? "unknown"} — ${err?.message ?? "invalid"}`,
    );
  }

  // Layer 3: syntactic — each .html file must be valid Nunjucks
  const env = new nunjucks.Environment(new FileMapLoader(files), { autoescape: false });
  for (const [name, content] of Object.entries(files)) {
    if (!name.endsWith(".html")) continue;
    try {
      env.parse(content as string);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new TemplateParseError(`Nunjucks syntax error in ${name}: ${msg}`);
    }
  }

  // Layer 6: security — run BEFORE dry-run so we never render untrusted content
  for (const [name, content] of Object.entries(files)) {
    if (!name.endsWith(".html")) continue;
    if (/<script[\s>]/i.test(content as string)) {
      throw new TemplateParseError(`Security: <script> tags are not allowed (found in ${name})`);
    }
  }

  // Layer 5: runtime dry-run — render must complete without throwing
  // Minimal mock context — enough for loops and conditionals to not crash
  const standardSections = Object.fromEntries(
    [...STANDARD_SECTION_IDS].map((id) => [id, { title: id, columns: 1, hidden: false, items: [] }]),
  );
  const mockContext = {
    basics: { name: "Test User", headline: "Engineer", email: "t@test.com", phone: "", location: "", website: { url: "", label: "" }, customFields: [] },
    picture: { hidden: true, url: "", size: 64, rotation: 0, aspectRatio: 1, borderRadius: 0, borderColor: "", borderWidth: 0, shadowColor: "", shadowWidth: 0 },
    summary: { title: "Summary", columns: 1, hidden: false, content: "<p>Test summary</p>" },
    sections: standardSections,
    customSections: [],
    sectionById: standardSections,
    metadata: {
      template: result.data.metadata.id,
      layout: { sidebarWidth: 35, pages: [{ fullWidth: false, main: ["experience", "education"], sidebar: ["skills"] }] },
      page: { format: "a4", gapX: 4, gapY: 6, marginX: 14, marginY: 12, locale: "en-US", hideIcons: false },
      design: { colors: { primary: "rgba(0,0,0,1)", text: "rgba(0,0,0,1)", background: "rgba(255,255,255,1)" }, level: { icon: "", type: "circle" } },
      typography: { body: { fontFamily: "sans-serif", fontWeights: ["400"], fontSize: 10, lineHeight: 1.5 }, heading: { fontFamily: "sans-serif", fontWeights: ["600"], fontSize: 14, lineHeight: 1.5 }, slots: {} },
      notes: "",
    },
  };

  try {
    env.render("index.html", mockContext);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new TemplateParseError(`Template dry-run render failed: ${msg}`);
  }

  // Warnings — non-blocking
  const warnings: Array<{ type: string; message: string }> = [];

  // Layer 4: sidebar contract warning
  if (result.data.metadata.sidebarPosition !== "none") {
    const allHtml = Object.entries(files)
      .filter(([n]) => n.endsWith(".html"))
      .map(([, c]) => c)
      .join("\n");
    if (!allHtml.includes("page.sidebar")) {
      warnings.push({
        type: "sidebar-not-rendered",
        message: `sidebarPosition is "${result.data.metadata.sidebarPosition}" but no file references page.sidebar — sidebar sections will not appear in output`,
      });
    }
  }

  // Section-not-implemented warnings
  const sectionFiles = new Set(
    Object.keys(files)
      .filter((n) => n.startsWith("sections/") && n.endsWith(".html"))
      .map((n) => n.slice("sections/".length, -".html".length)),
  );
  for (const sectionId of STANDARD_SECTION_IDS) {
    if (!sectionFiles.has(sectionId) && !sectionFiles.has("default")) {
      warnings.push({
        type: "section-not-implemented",
        message: `Section "${sectionId}" has no implementation file and no sections/default.html fallback`,
      });
    }
  }

  return { ...result.data, warnings };
};
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @reactive-resume/renderer test -- src/parse-template.test.ts
```

Expected: PASS (18 tests)

- [ ] **Step 5: Run full renderer test suite**

```bash
pnpm --filter @reactive-resume/renderer test
```

Expected: PASS (all tests)

- [ ] **Step 6: Typecheck**

```bash
pnpm --filter @reactive-resume/renderer typecheck
```

Expected: no errors

- [ ] **Step 7: Update `src/index.ts` with final exports**

```typescript
// packages/renderer/src/index.ts
export { render } from "./render";
export type { RenderContext } from "./render";
export { parseTemplate, TemplateParseError } from "./parse-template";
export { buildInjectedStyles } from "./css-injection";
export { createEnvironment } from "./environment";
export { registerFilters } from "./filters";
export { FileMapLoader } from "./loader";
```

- [ ] **Step 8: Commit**

```bash
git add packages/renderer/src/parse-template.ts packages/renderer/src/parse-template.test.ts packages/renderer/src/index.ts
git commit -m "feat(renderer): add parseTemplate() — unzips .rxt, validates, extracts metadata + slots — Phase 2 complete"
```

---

## Phase 3 sketch: Puppeteer PDF generation

> Full plan written after Phase 2 is complete.

**What changes:**
- `packages/pdf/src/server.ts` — replace `@react-pdf/renderer` with Puppeteer: fetch template files from DB by active template ID → `render(files, data, metadata, id, baseUrl)` → `puppeteer.page.pdf()`
- `apps/server/src/http/fonts.ts` — `/api/templates/:id/fonts/:filename` route: fetch base64 font from DB `files` JSONB map, serve as `font/woff2`
- `apps/server` — Puppeteer browser instance lifecycle (launch once on startup, reuse across requests)

**Key decisions needed:**
- `puppeteer` (bundles Chromium) vs `puppeteer-core` (bring your own)
- Browser instance pooling strategy
- How `baseUrl` is passed to `render()` so `@font-face` URLs point to the correct host

---

## Phase 4 sketch: Builder preview iframe

> Full plan written after Phase 3 is complete.

**What changes:**
- `apps/web/src/features/resume/preview/` — replace React PDF viewer with `<iframe srcDoc={renderedHtml}>`
- Browser calls `render(activeTemplate.files, resumeData, activeTemplate.metadata, activeTemplate.id, window.location.origin)`
- Live updates: re-render on every debounced data change, update `srcDoc`
- Google Fonts `<link>` tags load in the iframe naturally; bundled fonts served via same font endpoint

**Key decisions needed:**
- `srcDoc` vs blob URL (srcDoc simpler, blob URL allows proper relative asset base)
- `@media screen` fallback styles for preview (CSS Paged Media `@page` rules don't apply in iframes)

---

## Phase 5 sketch: DB schema + startup seeding + import/export API + font picker

> Full plan written after Phase 4 is complete.

**DB schema** — `packages/db/src/schema/templates.ts`:

```typescript
{
  id:           text (primary key — slug)
  name:         text
  files:        jsonb  // { "index.html": "...", "fonts/x.woff2": "<base64>" }
  metadata:     jsonb  // TemplateMetadata (includes fonts, sidebarPosition, tags)
  inputs:       jsonb  // ResumeSlot[]
  previewImage: text   // base64 PNG (Puppeteer screenshot with mock data)
  isBuiltin:    boolean
  userId:       uuid | null
  createdAt:    timestamp
  updatedAt:    timestamp
}
```

**Startup seeding** — `apps/server/src/startup/seed-templates.ts`:
- Reads each `.rxt` file from `packages/pdf/src/templates/`
- Calls `parseTemplate(buf)` to extract files + metadata + inputs
- Generates preview image via Puppeteer screenshot with mock data
- Upserts into `templates` table keyed on `id`

**API** — `packages/api/src/features/templates/`:
- `list` — built-in templates + authed user's imported templates
- `import` — upload `.rxt` → 6-layer validation → generate preview → insert with `userId`, `isBuiltin: false`
- `export` — fetch `files` JSONB from DB → reconstruct zip → return as `application/zip` with `Content-Disposition: attachment; filename="<id>.rxt"`
- `delete` — user can delete their own imported templates only

**Font picker** — `apps/web`:
- When template is active, read `metadata.fonts` and `metadata.typography` from the active template DB row
- Font picker shows: **Template fonts** group (top) + **System fonts** group (below)
- The typography panel renders one font+size+weight row per declared slot (labeled with `slot.label`); built-in `body` and `heading` slots always shown
- Selecting a font/size for slot `id` writes to `metadata.typography.slots[id].fontFamily` (or `.fontSize`, `.fontWeight`) via JSON Patch auto-save → CSS vars recomputed on next render

**Documentation** — `docs/templates/authoring-guide.md` stub created with archive structure, template.json reference, and font system overview.

---

## Phase 6 sketch: Template-aware item editor + typography panel

> Full plan written after Phase 5 is complete.

**Custom input fields (`<resume-slot>`):**
- `apps/web` — when the active template has `inputs` for an item type (e.g. `experienceItem`), the item form renders extra fields below the standard fields
- Each `<resume-slot>` type maps to a form control: `rich-text` → existing rich text editor, `image` → image upload, `image-list` → multi-image upload, `toggle` → checkbox, etc.
- Values saved to `item.extensions[slot.id]` via the existing JSON Patch auto-save mechanism

**Typography slot controls:**
- `apps/web` typography panel — when the active template declares `typography` slots, the panel renders one font+size+weight row per slot (labeled with `slot.label`)
- Built-in `body` and `heading` slots always shown; additional template slots shown below
- Each slot's font picker shows template fonts (top group) + system fonts (bottom group)
- User choices written to `metadata.typography.slots[slotId]` via JSON Patch auto-save

---

## Phase 7 sketch: Migrate 15 built-in templates

> Full plan written after Phase 6 is complete.

**What changes:**
- Each of the 15 React PDF components in `packages/pdf/src/templates/<name>/` becomes a `packages/pdf/src/templates/<name>.rxt` archive with `template.json`, `index.html`, and `sections/*.html`
- The startup seeder picks up the `.rxt` files and upserts them into the `templates` table
- Old React PDF components deleted after each migration is verified end-to-end
- `@react-pdf/renderer` dependency removed once all 15 are migrated

---

## Phase 8 sketch: Khaled's resume template + authoring guide

> Full plan written after Phase 7 is complete.

**Template characteristics (from reference PDF):**
- Table-style header (personal details left, education right)
- Two-column experience layout (company + logo left, roles right)
- 4-column skill grid
- Badge-grid certifications (`<resume-slot id="badgeImage" item-type="certificationItem" type="image">`)
- Product logo rows per experience item (`<resume-slot id="productLogos" item-type="experienceItem" type="image-list">`)
- Bundled custom font (Playfair Display)

**Authoring guide** (`docs/templates/authoring-guide.md`) finalized using this template as the worked example. Link added to the import dialog UI.
