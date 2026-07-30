# Semantic CSS Author Reference and Unified Documentation Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a canonical author-facing Semantic CSS language reference, link it from Custom Styles, and make `pnpm docs:gen` regenerate every Semantic CSS, Resume JSON Schema, and OpenAPI documentation artifact.

**Architecture:** Keep runtime registries and PDF template manifests authoritative, adding only the missing structured metadata needed for documentation. A tooling-owned generator updates Semantic CSS and Resume JSON Schema Markdown from those sources, while a server-owned generator reuses the runtime OpenAPI builder for `docs/spec.json`; the root command runs both. Generated Markdown is marker-delimited, deterministic, and tested against the committed artifacts.

**Tech Stack:** TypeScript, pnpm workspaces, Zod 4 JSON Schema conversion, oRPC OpenAPI, Vitest, React 19, Lingui, Mintlify MDX.

## Global Constraints

- The public reference route is exactly `https://docs.rxresu.me/guides/semantic-css-reference`.
- The audience is resume authors, not compiler contributors.
- The root command is exactly `pnpm docs:gen`; remove the obsolete `docs:semantic-css` script.
- `pnpm docs:gen` regenerates `docs/guides/semantic-css-reference.mdx`, `skills/resume-builder/references/schema.md`, `docs/guides/json-resume-schema.mdx`, and `docs/spec.json`.
- The checked-in OpenAPI document uses `https://rxresu.me/api/openapi` and the root package version.
- Runtime `/schema.json`, the skill schema reference, and the JSON schema guide use one canonical input-side JSON Schema created from `resumeDataSchema`.
- Complete Semantic CSS examples marked as valid must compile; selected invalid examples must emit their documented code.
- Preserve distinct `list-item` row, `list-item-content`, and `list-marker` author semantics.
- Do not add a shared docs-link component, URL registry, documentation playground, or contributor/compiler architecture page.
- Do not add a general file-transaction framework; compute each generator's complete output set before its first write.
- Preserve all pre-existing worktree changes. When a target file is already modified, stage only this plan's hunks and inspect `git diff --cached` before committing.
- Verification is CLI-based. Do not use Chrome.

## File Map

### Canonical schema and API artifacts

- Create `packages/schema/src/resume/json-schema.ts`: the only Zod-to-JSON-Schema conversion policy for ResumeData.
- Create `packages/schema/src/resume/json-schema.test.ts`: proves transforms are handled and the emitted schema describes input payloads.
- Modify `apps/server/src/static/schema.ts`: return the canonical schema helper result.
- Create `apps/server/src/openapi/generator.ts`: own the shared OpenAPI router and `generateOpenApiSpec`.
- Create `apps/server/src/openapi/generator.test.ts`: verify caller-provided URL/version and stable API metadata.
- Create `apps/server/src/openapi/generate-spec.ts`: write the production documentation spec.
- Modify `apps/server/src/openapi/handler.ts`: delegate spec generation while retaining request handling.
- Modify `apps/server/package.json`: expose the server-side docs generation command.

### Semantic CSS reference metadata

- Modify `packages/resume/src/stylesheet/diagnostics.ts`: add the typed compiler diagnostic catalog.
- Modify `packages/resume/src/stylesheet/values.ts`: constrain the internal diagnostic helper to catalog codes.
- Modify `packages/resume/src/stylesheet/registry/semantic.ts`: expose known attribute values, add `contact-list` as a valid template-part parent, and register the two Chikorita contact-row child contracts.
- Modify `packages/resume/src/stylesheet/registry/index.ts`: export the new public metadata.
- Modify `packages/resume/src/stylesheet/index.ts`: export compiler diagnostics and limits for generation.
- Modify `packages/resume/src/stylesheet/registry/semantic.test.ts`: verify the new parent/value metadata.
- Create `packages/pdf/src/semantic/preflight-reference.ts`: pure failure metadata and author-facing preflight limits.
- Modify `packages/pdf/src/semantic/preflight-core.tsx`: consume the catalog-backed failure-code type.
- Modify `packages/pdf/src/semantic/template-manifest.ts`: expose the frozen manifest record through the existing getter.
- Modify `packages/pdf/src/semantic/template-manifest.test.ts`: enforce primitive-part child coverage.
- Modify `packages/pdf/src/server.tsx`: retain the existing preflight type exports.
- Modify `packages/pdf/package.json`: add an explicit `./semantic-manifest` export for the tooling package.
- Modify `apps/server/src/services/stylesheet-preflight.ts`: consume and re-export the shared preflight limits.

### Documentation generation and content

- Modify `tooling/package.json`: add schema/PDF workspace dependencies and a package-local `docs:gen` script.
- Modify `tooling/semantic-css/generate-reference.ts`: render all Semantic CSS and Resume JSON Schema outputs.
- Modify `tooling/semantic-css/generate-reference.test.ts`: verify markers, determinism, manifest coverage, examples, and committed output synchronization.
- Modify `package.json`: replace `docs:semantic-css` with the root `docs:gen` orchestration.
- Rewrite `docs/guides/semantic-css-reference.mdx`: the author-facing Semantic CSS reference with generated sections and recipes.
- Modify `docs/guides/json-resume-schema.mdx`: replace the hand-copied schema with one generated block.
- Regenerate `skills/resume-builder/references/schema.md`: compact field-path reference for AI authors.
- Regenerate `docs/spec.json`: current version and production server URL.
- Modify `docs/docs.json`: add the Semantic CSS reference after Using Custom Styles.

### Custom Styles hint

- Modify `apps/web/src/features/resume/stylesheet/editor.tsx`: render the translated, accessible docs hint in shared editor chrome.
- Modify `apps/web/src/features/resume/stylesheet/editor.test.tsx`: verify the exact link contract on desktop and in the mobile sheet.

---

### Task 1: Canonical Resume JSON Schema

**Files:**
- Create: `packages/schema/src/resume/json-schema.ts`
- Create: `packages/schema/src/resume/json-schema.test.ts`
- Modify: `apps/server/src/static/schema.ts`

**Interfaces:**
- Consumes: `resumeDataSchema` from `@reactive-resume/schema/resume/data`.
- Produces: `createResumeDataJsonSchema(): ReturnType<typeof z.toJSONSchema>`.
- Produces: an input-side draft 2020-12 schema that tolerates Zod transforms with `unrepresentable: "any"`.

- [ ] **Step 1: Write the failing canonical-schema test**

```ts
import { describe, expect, it } from "vitest";
import { createResumeDataJsonSchema } from "./json-schema";

describe("createResumeDataJsonSchema", () => {
	it("describes accepted ResumeData input even when the Zod schema contains transforms", () => {
		const schema = createResumeDataJsonSchema();

		expect(schema).toMatchObject({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "object",
			required: ["picture", "basics", "summary", "sections", "customSections", "metadata"],
			properties: {
				picture: { type: "object" },
				basics: { type: "object" },
				sections: { type: "object" },
				metadata: { type: "object" },
			},
		});
	});
});
```

- [ ] **Step 2: Run the schema test and verify the missing module failure**

Run:

```bash
pnpm --filter @reactive-resume/schema test -- src/resume/json-schema.test.ts
```

Expected: FAIL because `./json-schema` does not exist.

- [ ] **Step 3: Add the canonical conversion helper**

```ts
import z from "zod";
import { resumeDataSchema } from "./data";

export function createResumeDataJsonSchema() {
	return z.toJSONSchema(resumeDataSchema, {
		io: "input",
		unrepresentable: "any",
	});
}
```

This policy is deliberate: documentation describes accepted resume payloads, and transform output cannot be represented exactly in JSON Schema.

- [ ] **Step 4: Route `/schema.json` through the helper**

Replace the direct Zod conversion in `apps/server/src/static/schema.ts` with:

```ts
import { createResumeDataJsonSchema } from "@reactive-resume/schema/resume/json-schema";

export function handleSchemaJson() {
	return Response.json(createResumeDataJsonSchema(), {
		status: 200,
		headers: {
			"Content-Type": "application/schema+json; charset=utf-8",
			"Cache-Control": "public, max-age=86400, immutable",
			"Surrogate-Control": "max-age=86400",
			"X-Content-Type-Options": "nosniff",
			"X-Robots-Tag": "index, follow",
			ETag: appVersion,
			Vary: "Accept",
		},
	});
}
```

- [ ] **Step 5: Run focused tests and typechecks**

Run:

```bash
pnpm --filter @reactive-resume/schema test -- src/resume/json-schema.test.ts
pnpm --filter @reactive-resume/schema typecheck
pnpm --filter server typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit only the canonical-schema changes**

```bash
git add packages/schema/src/resume/json-schema.ts packages/schema/src/resume/json-schema.test.ts apps/server/src/static/schema.ts
git diff --cached --check
git commit -m "refactor: centralize resume JSON schema generation"
```

---

### Task 2: Shared Runtime and Documentation OpenAPI Generator

**Files:**
- Create: `apps/server/src/openapi/generator.ts`
- Create: `apps/server/src/openapi/generator.test.ts`
- Create: `apps/server/src/openapi/generate-spec.ts`
- Modify: `apps/server/src/openapi/handler.ts`
- Modify: `apps/server/package.json`

**Interfaces:**
- Consumes: the current oRPC router, `downloadResumePdfProcedure`, and explicit `{ appUrl, version }`.
- Produces: `generateOpenApiSpec(options: { appUrl: string; version: string }): Promise<object>`.
- Produces: server script `pnpm --filter server docs:gen`.

- [ ] **Step 1: Write the failing OpenAPI generator test**

```ts
import { describe, expect, it } from "vitest";
import { generateOpenApiSpec } from "./generator";

describe("generateOpenApiSpec", () => {
	it("uses caller-provided application URL and version", async () => {
		const spec = await generateOpenApiSpec({
			appUrl: "https://rxresu.me",
			version: "9.8.7",
		});

		expect(spec.info).toMatchObject({
			title: "Reactive Resume",
			version: "9.8.7",
		});
		expect(spec.servers).toEqual([{ url: "https://rxresu.me/api/openapi" }]);
		expect(spec.externalDocs).toEqual({
			url: "https://docs.rxresu.me",
			description: "Reactive Resume Documentation",
		});
	});
});
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run:

```bash
pnpm --filter server test -- src/openapi/generator.test.ts
```

Expected: FAIL because `./generator` does not exist.

- [ ] **Step 3: Extract the router and OpenAPI builder**

Move `openAPIRouter`, `openAPIGenerator`, and the current metadata object from `handler.ts` into `generator.ts`. Keep the existing download-PDF override and internal-route filter. Export:

```ts
export const openAPIRouter = {
	...router,
	resume: {
		...router.resume,
		downloadPdf: downloadResumePdfProcedure,
	},
};

export async function generateOpenApiSpec({ appUrl, version }: { appUrl: string; version: string }) {
	return openAPIGenerator.generate(openAPIRouter, {
		info: {
			title: "Reactive Resume",
			version,
			description: "Reactive Resume API",
			license: { name: "MIT", url: "https://github.com/amruthpillai/reactive-resume/blob/main/LICENSE" },
			contact: { name: "Amruth Pillai", email: "hello@amruthpillai.com", url: "https://amruthpillai.com" },
		},
		servers: [{ url: `${appUrl}/api/openapi` }],
		externalDocs: { url: "https://docs.rxresu.me", description: "Reactive Resume Documentation" },
		commonSchemas: {
			ResumeData: { schema: resumeDataSchema },
		},
		components: {
			securitySchemes: {
				apiKey: {
					type: "apiKey",
					name: "x-api-key",
					in: "header",
					description: "The API key to authenticate requests.",
				},
			},
		},
		security: [{ apiKey: [] }],
		filter: ({ contract }) => !contract["~orpc"].route.tags?.includes("Internal"),
	});
}
```

- [ ] **Step 4: Make the runtime handler delegate**

Keep `OpenAPIHandler`, plugins, interceptors, locale, and response-header behavior in `handler.ts`. Replace only its spec-building branch:

```ts
if (request.method === "GET" && (request.url.endsWith("/spec.json") || request.url.endsWith("/spec"))) {
	return Response.json(await generateOpenApiSpec({ appUrl: env.APP_URL, version: appVersion }));
}
```

- [ ] **Step 5: Add the deterministic documentation writer**

Create `generate-spec.ts` with a default target of `docs/spec.json`, read the root `package.json` version, and serialize with tabs plus one trailing newline:

```ts
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { generateOpenApiSpec } from "./generator";

export async function generateOpenApiDocumentation(
	target = fileURLToPath(new URL("../../../../docs/spec.json", import.meta.url)),
) {
	const packageJson = JSON.parse(
		await readFile(new URL("../../../../package.json", import.meta.url), "utf8"),
	) as { version: string };
	const spec = await generateOpenApiSpec({ appUrl: "https://rxresu.me", version: packageJson.version });
	await writeFile(target, `${JSON.stringify(spec, null, "\t")}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	await generateOpenApiDocumentation(process.argv[2]);
}
```

Add to `apps/server/package.json`:

```json
"docs:gen": "tsx src/openapi/generate-spec.ts"
```

- [ ] **Step 6: Run focused OpenAPI tests and typecheck**

Run:

```bash
pnpm --filter server test -- src/openapi/generator.test.ts src/http/app.test.ts
pnpm --filter server typecheck
```

Expected: PASS, and existing request routing remains unchanged.

- [ ] **Step 7: Commit the shared OpenAPI builder**

```bash
git add apps/server/src/openapi/generator.ts apps/server/src/openapi/generator.test.ts apps/server/src/openapi/generate-spec.ts apps/server/src/openapi/handler.ts apps/server/package.json
git diff --cached --check
git commit -m "refactor: share OpenAPI documentation generator"
```

---

### Task 3: Structured Semantic CSS Reference Metadata

**Files:**
- Modify: `packages/resume/src/stylesheet/diagnostics.ts`
- Modify: `packages/resume/src/stylesheet/values.ts`
- Modify: `packages/resume/src/stylesheet/registry/semantic.ts`
- Modify: `packages/resume/src/stylesheet/registry/index.ts`
- Modify: `packages/resume/src/stylesheet/index.ts`
- Modify: `packages/resume/src/stylesheet/registry/semantic.test.ts`
- Create: `packages/pdf/src/semantic/preflight-reference.ts`
- Modify: `packages/pdf/src/semantic/preflight-core.tsx`
- Modify: `packages/pdf/src/semantic/template-manifest.test.ts`
- Modify: `packages/pdf/src/server.tsx`
- Modify: `packages/pdf/package.json`
- Modify: `apps/server/src/services/stylesheet-preflight.ts`

**Interfaces:**
- Produces: `SEMANTIC_CSS_DIAGNOSTIC_CATALOG_V1`, keyed by every compiler diagnostic code.
- Produces: `attributeValues?: Readonly<Record<string, readonly string[]>>` on semantic definitions.
- Produces: `PDF_PREFLIGHT_DIAGNOSTIC_CATALOG`, keyed by every `PdfPreflightFailureCode`, without importing the PDF renderer.
- Produces: `STYLESHEET_PREFLIGHT_LIMITS`, shared by docs and the server runner.
- Produces: `@reactive-resume/pdf/semantic-manifest` as a tooling-safe explicit export.

- [ ] **Step 1: Write failing registry and manifest consistency assertions**

Add to `semantic.test.ts`:

```ts
expect(SEMANTIC_REGISTRY_V1.resume.attributeValues?.template).toEqual(templateSchema.options);
expect(SEMANTIC_REGISTRY_V1.section.attributeValues).toMatchObject({
	type: sectionTypeSchema.options,
	placement: ["main", "sidebar"],
	origin: ["main", "sidebar"],
});
expect(SEMANTIC_REGISTRY_V1["template-part"].parents).toContain("contact-list");
expect(TEMPLATE_PART_CHILD_KINDS_V1["contact-row-primary"]).toEqual(["contact-item"]);
expect(TEMPLATE_PART_CHILD_KINDS_V1["contact-row-secondary"]).toEqual(["contact-item"]);
```

Add to `template-manifest.test.ts`:

```ts
for (const manifest of Object.values(getTemplateSemanticRegistryFingerprintInput())) {
	for (const part of manifest.parts) {
		if (part.binding.type === "alias") continue;
		expect(TEMPLATE_PART_CHILD_KINDS_V1, `${manifest.template}:${part.name}`).toHaveProperty(part.name);
	}
}
```

- [ ] **Step 2: Run the focused tests and verify the missing metadata failures**

Run:

```bash
pnpm --filter @reactive-resume/resume test -- src/stylesheet/registry/semantic.test.ts
pnpm --filter @reactive-resume/pdf test -- src/semantic/template-manifest.test.ts
```

Expected: FAIL for missing attribute domains, `contact-list` parent support, and Chikorita contact-row child contracts.

- [ ] **Step 3: Add semantic attribute domains and parent/child consistency**

Extend `SemanticNodeDefinition`:

```ts
export type SemanticNodeDefinition = {
	parents: readonly SemanticNodeKind[];
	attributes: readonly string[];
	roles: readonly string[];
	attributeValues?: Readonly<Record<string, readonly string[]>>;
};
```

Import `sectionTypeSchema` and `templateSchema`, then add finite domains:

```ts
resume: {
	parents: [],
	attributes: ["template"],
	roles: [],
	attributeValues: { template: templateSchema.options },
},
region: {
	parents: ["page"],
	attributes: ["placement", "region", "part"],
	roles: [],
	attributeValues: {
		placement: ["main", "sidebar"],
		region: ["header", "main", "sidebar", "featured"],
	},
},
section: {
	parents: ["region"],
	attributes: ["type", "placement", "origin", "part"],
	roles: ["featured-summary"],
	attributeValues: {
		type: sectionTypeSchema.options,
		placement: ["main", "sidebar"],
		origin: ["main", "sidebar"],
	},
},
"rich-heading": {
	parents: ["rich-text"],
	attributes: ["level"],
	roles: [],
	attributeValues: { level: ["1", "2", "3", "4", "5", "6"] },
},
"list-item-content": {
	parents: ["list-item"],
	attributes: ["direction"],
	roles: [],
	attributeValues: { direction: ["ltr", "rtl"] },
},
```

Add `"contact-list"` to the `template-part` parent list and:

```ts
"contact-row-primary": ["contact-item"],
"contact-row-secondary": ["contact-item"],
```

Do not invent domains for resume-specific IDs, names, page numbers, part names, or roles.

- [ ] **Step 4: Add exhaustive compiler diagnostic metadata**

Define:

```ts
type DiagnosticReference = {
	severity: SemanticCssDiagnostic["severity"];
	meaning: string;
	action: string;
};

export const SEMANTIC_CSS_DIAGNOSTIC_CATALOG_V1 = {
	MISSING_VERSION_DIRECTIVE: {
		severity: "warning",
		meaning: "The stylesheet omitted @version.",
		action: "Add @version 1; as the first statement.",
	},
	DUPLICATE_VERSION_DIRECTIVE: {
		severity: "error",
		meaning: "More than one @version directive was found.",
		action: "Keep exactly one version directive.",
	},
	INVALID_VERSION: {
		severity: "error",
		meaning: "The version directive is not one positive integer without a block.",
		action: "Use @version 1;.",
	},
	VERSION_MISMATCH: {
		severity: "error",
		meaning: "The directive and stored language version disagree.",
		action: "Set both to version 1.",
	},
	UNSUPPORTED_VERSION: {
		severity: "error",
		meaning: "The requested Semantic CSS version is not implemented.",
		action: "Use @version 1;.",
	},
	CSS_PARSE_ERROR: {
		severity: "error",
		meaning: "The stylesheet is not valid parseable CSS syntax.",
		action: "Fix the syntax at the reported source range.",
	},
	CSS_RAW_SYNTAX: {
		severity: "error",
		meaning: "The parser encountered unsupported raw CSS syntax.",
		action: "Rewrite the declaration or selector using documented Semantic CSS syntax.",
	},
	FORBIDDEN_AT_RULE: {
		severity: "error",
		meaning: "The at-rule can load resources or execute unsupported CSS behavior.",
		action: "Remove the at-rule.",
	},
	UNSUPPORTED_AT_RULE: {
		severity: "error",
		meaning: "The at-rule is not part of Semantic CSS version 1.",
		action: "Use only @version and documented @media queries.",
	},
	INVALID_MEDIA_QUERY: {
		severity: "error",
		meaning: "The PDF dimension query is malformed or unsupported.",
		action: "Use width, min-width, max-width, height, min-height, or max-height with a Semantic CSS length.",
	},
	MEDIA_PAGE_SIZE: {
		severity: "error",
		meaning: "A media rule attempts to change the page size it is evaluated against.",
		action: "Move the page size declaration outside @media.",
	},
	INVALID_SELECTOR: {
		severity: "error",
		meaning: "The selector uses unsupported syntax or exceeds selector limits.",
		action: "Rewrite it using documented Semantic CSS selectors and combinators.",
	},
	UNSUPPORTED_PROPERTY: {
		severity: "error",
		meaning: "The property is not in the Semantic CSS property registry.",
		action: "Choose a property from the property reference.",
	},
	SYSTEM_VARIABLE_READONLY: {
		severity: "error",
		meaning: "An author attempted to assign a reserved --resume-* variable.",
		action: "Read the system variable or rename the author variable.",
	},
	FORBIDDEN_CSS_VALUE: {
		severity: "error",
		meaning: "The value attempts to use an external resource or forbidden CSS capability.",
		action: "Use a PDF-safe local value.",
	},
	INVALID_VALUE: {
		severity: "error",
		meaning: "The value does not match the supported grammar for the property.",
		action: "Use the documented property value form.",
	},
	VARIABLE_CYCLE: {
		severity: "error",
		meaning: "Custom properties form a var() reference cycle.",
		action: "Break the cycle or provide a non-cyclic fallback.",
	},
	UNRESOLVED_VARIABLE: {
		severity: "error",
		meaning: "A var() reference has neither a value nor a usable fallback.",
		action: "Define the variable or add a fallback.",
	},
	EXTREME_VALUE: {
		severity: "warning",
		meaning: "A value is valid but likely to produce unusable output.",
		action: "Reduce the value unless the effect is intentional.",
	},
	SELECTOR_NO_MATCH: {
		severity: "warning",
		meaning: "The selector matches no node in the current resume and template.",
		action: "Check the ID, attribute value, placement, or template guard.",
	},
	PROPERTY_NOT_APPLICABLE: {
		severity: "warning",
		meaning: "The property cannot affect any matched semantic node kind.",
		action: "Target a node listed in the property's Applies to column.",
	},
	RESOURCE_LIMIT: {
		severity: "error",
		meaning: "Compilation, matching, values, variables, or semantic nodes exceeded a bounded Semantic CSS limit.",
		action: "Reduce stylesheet or resume complexity.",
	},
} as const satisfies Readonly<Record<string, DiagnosticReference>>;

export type SemanticCssCompilerDiagnosticCode = keyof typeof SEMANTIC_CSS_DIAGNOSTIC_CATALOG_V1;
```

Change `createDiagnostic` and the private `values.ts` helper to accept `SemanticCssCompilerDiagnosticCode`. Export the catalog through `@reactive-resume/resume/stylesheet`.

- [ ] **Step 5: Add exhaustive PDF preflight metadata and shared limits**

Create `preflight-reference.ts` so documentation generation does not load React PDF merely to read constants:

```ts
export const PDF_PREFLIGHT_DIAGNOSTIC_CATALOG = {
	STYLESHEET_PREFLIGHT_INVALID: {
		meaning: "The stylesheet has compiler or semantic errors.",
		action: "Fix the accompanying Semantic CSS diagnostics.",
	},
	STYLESHEET_PREFLIGHT_PAGE_SIZE_LIMIT: {
		meaning: "An authored page exceeds the PDF dimension or area budget.",
		action: "Use a smaller page size.",
	},
	STYLESHEET_PREFLIGHT_BYTE_LIMIT: {
		meaning: "The rendered PDF exceeds the byte budget.",
		action: "Reduce pages, images, or styled content.",
	},
	STYLESHEET_PREFLIGHT_PAGE_LIMIT: {
		meaning: "The rendered PDF exceeds the page-count budget.",
		action: "Reduce content or pagination.",
	},
	STYLESHEET_PREFLIGHT_TIMEOUT: {
		meaning: "PDF preflight exceeded its deadline.",
		action: "Reduce stylesheet or document complexity and retry.",
	},
	STYLESHEET_PREFLIGHT_MEMORY_LIMIT: {
		meaning: "PDF preflight exceeded its memory budget.",
		action: "Reduce document, image, or layout complexity.",
	},
	STYLESHEET_PREFLIGHT_RENDER_FAILED: {
		meaning: "The PDF renderer could not render the candidate stylesheet.",
		action: "Simplify the candidate and inspect accompanying diagnostics.",
	},
	STYLESHEET_PREFLIGHT_PARSE_FAILED: {
		meaning: "The rendered PDF could not be inspected.",
		action: "Retry after simplifying the candidate.",
	},
	STYLESHEET_PREFLIGHT_WORKER_FAILED: {
		meaning: "The isolated PDF preflight worker failed or its queue was full.",
		action: "Retry; simplify the candidate if the failure repeats.",
	},
} as const;

export type PdfPreflightFailureCode = keyof typeof PDF_PREFLIGHT_DIAGNOSTIC_CATALOG;

export const STYLESHEET_PREFLIGHT_LIMITS = Object.freeze({
	timeoutMs: 5_000,
	maxPages: 20,
	maxBytes: 10_000_000,
	maxPageWidthPt: 2_000,
	maxPageHeightPt: 20_000,
	maxPageAreaPt2: 20_000_000,
	maxOldGenerationMb: 256,
	maxConcurrentWorkers: 1,
	maxQueuedRequests: 32,
});
```

Import `PdfPreflightFailureCode` into `preflight-core.tsx` and re-export the type there so current browser/server entrypoints retain their interface. Import and re-export `STYLESHEET_PREFLIGHT_LIMITS` from `apps/server/src/services/stylesheet-preflight.ts` so current callers and tests also retain their interface. Add an explicit `@reactive-resume/pdf/preflight-reference` package export for the tooling generator.

- [ ] **Step 6: Expose actual template manifests to tooling**

Add the package export:

```json
"./semantic-manifest": "./src/semantic/template-manifest.ts"
```

The tooling generator will call the existing:

```ts
getTemplateSemanticRegistryFingerprintInput(): Readonly<Record<Template, TemplateSemanticManifest>>
```

Do not create a duplicate reference-specific manifest.

- [ ] **Step 7: Run focused metadata tests and boundaries**

Run:

```bash
pnpm --filter @reactive-resume/resume test -- src/stylesheet/registry/semantic.test.ts src/stylesheet/values.test.ts
pnpm --filter @reactive-resume/pdf test -- src/semantic/template-manifest.test.ts src/semantic/preflight-core.test.tsx
pnpm --filter server test -- src/services/stylesheet-preflight.test.ts
pnpm --filter @reactive-resume/resume typecheck
pnpm --filter @reactive-resume/pdf typecheck
pnpm --filter server typecheck
pnpm exec turbo boundaries
```

Expected: PASS.

- [ ] **Step 8: Commit only the structured reference metadata**

Stage only the task's hunks, especially in already-modified PDF files:

```bash
git add -p packages/resume/src/stylesheet packages/pdf/src apps/server/src/services/stylesheet-preflight.ts packages/pdf/package.json
git diff --cached --check
git diff --cached
git commit -m "feat: expose Semantic CSS reference metadata"
```

---

### Task 4: Unified Semantic CSS and Resume Schema Markdown Generator

**Files:**
- Modify: `tooling/package.json`
- Modify: `tooling/semantic-css/generate-reference.ts`
- Modify: `tooling/semantic-css/generate-reference.test.ts`
- Modify: `package.json`
- Modify: `docs/guides/json-resume-schema.mdx`

**Interfaces:**
- Consumes: canonical Resume JSON Schema, Semantic CSS registries/catalogs/limits, PDF preflight catalogs/limits, and actual template manifests.
- Produces: `updateGeneratedDocumentation(paths?: Partial<DocumentationPaths>): Promise<void>`.
- Produces: root `pnpm docs:gen`.

- [ ] **Step 1: Replace the synchronization test with failing multi-output tests**

Define targets:

```ts
export type DocumentationPaths = {
	semanticCssReference: string;
	jsonSchemaGuide: string;
	skillSchemaReference: string;
};
```

Tests must cover:

```ts
it("rejects missing and duplicate generated markers", () => {
	expect(() => replaceGeneratedBlock("plain text", "SEMANTIC-CSS-ELEMENTS", "body", "reference.mdx")).toThrow(
		/Missing generated markers/,
	);
	expect(() =>
		replaceGeneratedBlock(
			"<!-- SEMANTIC-CSS-ELEMENTS:START --><!-- SEMANTIC-CSS-ELEMENTS:END --><!-- SEMANTIC-CSS-ELEMENTS:START --><!-- SEMANTIC-CSS-ELEMENTS:END -->",
			"SEMANTIC-CSS-ELEMENTS",
			"body",
			"reference.mdx",
		),
	).toThrow(/Duplicate generated markers/);
});

it("builds identical output twice", async () => {
	expect(await buildGeneratedDocumentation(paths)).toEqual(await buildGeneratedDocumentation(paths));
});

it("documents every manifest part with its real selector form", () => {
	const table = renderTemplateParts(getTemplateSemanticRegistryFingerprintInput());
	for (const [template, manifest] of Object.entries(getTemplateSemanticRegistryFingerprintInput())) {
		for (const part of manifest.parts) {
			expect(table).toContain(`| \`${template}\``);
			expect(table).toContain(`\`${part.name}\``);
		}
	}
});
```

- [ ] **Step 2: Run the tooling test and verify it fails**

Run:

```bash
pnpm --filter @reactive-resume/tooling test -- semantic-css/generate-reference.test.ts
```

Expected: FAIL because the multi-output functions and markers do not exist.

- [ ] **Step 3: Add the minimum marker and output pipeline**

Implement:

```ts
export function replaceGeneratedBlock(source: string, name: string, body: string, path: string): string {
	const start = `<!-- ${name}:START -->`;
	const end = `<!-- ${name}:END -->`;
	const startMatches = source.split(start).length - 1;
	const endMatches = source.split(end).length - 1;

	if (startMatches === 0 || endMatches === 0) throw new Error(`Missing generated markers ${name} in ${path}.`);
	if (startMatches !== 1 || endMatches !== 1) throw new Error(`Duplicate generated markers ${name} in ${path}.`);

	const startIndex = source.indexOf(start);
	const endIndex = source.indexOf(end);
	if (endIndex < startIndex) throw new Error(`Generated markers ${name} are out of order in ${path}.`);

	return `${source.slice(0, startIndex)}${start}\n${body}\n${end}${source.slice(endIndex + end.length)}`;
}
```

`buildGeneratedDocumentation` reads every source, creates the canonical schema once, applies all blocks in memory, and returns the three complete output strings. `updateGeneratedDocumentation` calls it once and only then writes all three files with `Promise.all`. The determinism test uses temporary source files containing one of every required marker; the committed-output synchronization assertion is added after the real reference page is written in Task 5.

- [ ] **Step 4: Render the Semantic CSS factual blocks**

Use stable sort order and these marker names:

- `SEMANTIC-CSS-SEMANTIC-ELEMENTS`
- `SEMANTIC-CSS-PROPERTIES`
- `SEMANTIC-CSS-SYSTEM-VARIABLES`
- `SEMANTIC-CSS-TEMPLATE-PARTS`
- `SEMANTIC-CSS-DIAGNOSTICS`
- `SEMANTIC-CSS-LIMITS`

Required table columns:

```text
Semantic elements: Element | Parents | Attributes | Known values | Roles
Properties: Property | Category | Applies to | Inherits | Units | Known keywords
System variables: Variable | Runtime value
Template parts: Template | Name | Selector | Owner/condition | Allowed children
Diagnostics: Code | Severity | Meaning | What to do
Limits: Stage | Limit | Value
```

For template parts:

```ts
const selector =
	part.binding.type === "primitive"
		? `template-part[name="${part.name}"]`
		: `${part.binding.canonicalKind}[role~="${part.binding.token}"]`;
```

Primitive parts read allowed children from `TEMPLATE_PART_CHILD_KINDS_V1`; missing coverage throws with `<template>:<part>`. Alias parts display “canonical node” instead of pretending that a template-part wrapper exists. Include owner placement, section types, columns, and last-item conditions when present.

Label registry values “Known keywords” and add this sentence below the table:

> Known keywords are completion hints, not a complete value grammar; use the property examples and value rules above for accepted numbers, colors, functions, and shorthands.

- [ ] **Step 5: Render both schema outputs from one schema object**

Serialize the full guide block as:

```ts
const fullSchemaBlock = [
	"```json /schema.json lines expandable",
	JSON.stringify(schema, null, "\t"),
	"```",
].join("\n");
```

Replace `RESUME-JSON-SCHEMA` markers in `docs/guides/json-resume-schema.mdx`.

For the skill reference, walk object properties and array item schemas depth-first. Emit:

```markdown
# Reactive Resume Schema Reference

Generated by `pnpm docs:gen` from `resumeDataSchema`. Do not edit this file directly.

Canonical schema: https://rxresu.me/schema.json

## Required top-level fields

`picture`, `basics`, `summary`, `sections`, `customSections`, and `metadata`

## Field catalog

| Path | Type | Required | Constraints and default | Description |
| --- | --- | --- | --- | --- |
```

Rules for the walker:

- Object properties append `.name`.
- Array items append `[]`.
- `anyOf`/`oneOf` types are joined with ` or ` and each branch is traversed.
- Required comes from the containing object's `required` array.
- Constraints include `enum`, `minimum`, `maximum`, `minLength`, `maxLength`, and JSON-stringified `default`.
- Escape Markdown pipes and newlines in descriptions.
- Prevent duplicate rows with a `Set` keyed by path plus rendered type.
- Sort object property names in their schema-defined order and union branches in emitted order.

- [ ] **Step 6: Add package dependencies and the root command**

In `tooling/package.json`, add:

```json
"docs:gen": "tsx semantic-css/generate-reference.ts"
```

and workspace dependencies for `@reactive-resume/pdf` and `@reactive-resume/schema`.

In the root `package.json`, replace `docs:semantic-css` with:

```json
"docs:gen": "pnpm --filter @reactive-resume/tooling docs:gen && pnpm --filter server docs:gen"
```

- [ ] **Step 7: Run focused generator tests and typechecks**

Run:

```bash
pnpm install --lockfile-only
pnpm --filter @reactive-resume/tooling test -- semantic-css/generate-reference.test.ts
pnpm --filter @reactive-resume/tooling typecheck
pnpm --filter server test -- src/openapi/generator.test.ts
pnpm --filter server typecheck
pnpm exec turbo boundaries
```

Expected: PASS against temporary marker fixtures.

- [ ] **Step 8: Commit the generator implementation**

Stage only this task's changes:

```bash
git add package.json tooling/package.json tooling/semantic-css/generate-reference.ts tooling/semantic-css/generate-reference.test.ts docs/guides/json-resume-schema.mdx
git add -p pnpm-lock.yaml
git diff --cached --check
git diff --cached
git commit -m "feat: generate documentation artifacts"
```

---

### Task 5: Write and Generate the Author-Facing References

**Files:**
- Rewrite: `docs/guides/semantic-css-reference.mdx`
- Modify: `docs/guides/json-resume-schema.mdx`
- Regenerate: `skills/resume-builder/references/schema.md`
- Regenerate: `docs/spec.json`
- Modify: `docs/docs.json`
- Modify: `tooling/semantic-css/generate-reference.test.ts`

**Interfaces:**
- Consumes: the marker contracts and `pnpm docs:gen` from Task 4.
- Produces: the canonical public Semantic CSS reference route and all synchronized generated artifacts.

- [ ] **Step 1: Write the Semantic CSS page around the generated markers**

Use the approved ten-section structure:

1. Semantic CSS in one minute
2. Selector grammar
3. Semantic element catalog
4. Cascade and values
5. Property reference
6. PDF behavior
7. Template-specific selectors
8. Diagnostics and limits
9. Copy-paste recipes
10. Unsupported capabilities and portability checklist

Include this complete portable example and mark it for compiler verification:

````mdx
<!-- SEMANTIC-CSS-EXAMPLE:valid -->
```css
@version 1;

:root {
	--accent: #2563eb;
}

section-heading {
	color: var(--accent);
	border-bottom: 1pt solid var(--accent);
	padding-bottom: 3pt;
}

section[type="experience"] > section-items > item + item {
	margin-top: 8pt;
}

region[placement="sidebar"] section-heading {
	font-size: 10pt;
	text-transform: uppercase;
}
```
````

Include the complete selector forms:

```css
* { opacity: 1; }
section { margin-bottom: 8pt; }
#experience { break-before: page; }
[role~="primary-text"] { font-weight: 700; }
section[type="experience"] > section-items > item:first-child { margin-top: 0; }
field[name="company"], field[name="position"] { color: #111827; }
section:is([type="experience"], [type="education"]) { break-inside: avoid; }
item:not(:last-child) { margin-bottom: 6pt; }
```

Document all six supported attribute matchers: `=`, `~=`, `|=`, `^=`, `$=`, and `*=`. Attribute selector flags, custom classes, and pseudo-elements are rejected. Document `:root`, `:is()`, `:where()`, `:not()`, `:first-child`, `:last-child`, `:only-child`, `:nth-child()`, and `:nth-of-type()` with these exact restrictions:

- `:root`, `:first-child`, `:last-child`, and `:only-child` take no arguments.
- `:is()`, `:where()`, and `:not()` require a selector list.
- `:nth-child()` and `:nth-of-type()` accept integer `An+B`, `odd`, and `even`.
- `:nth-child()` may use an `of <selector-list>` clause.
- `:nth-of-type()` does not accept an `of` clause.
- A compound selector may contain only one semantic type selector.
- Selector functions, selector lists, selector length, and combinators are bounded by the generated limits.

Document media queries as comma-separated OR branches and `and`-combined features. Supported features are `width`, `min-width`, `max-width`, `height`, `min-height`, `max-height`, and `orientation: portrait|landscape`. Dimension values accept finite numbers with `pt`, `px`, `in`, `mm`, `cm`, `vw`, `vh`, `em`, or `rem`; omitted units resolve as points. Media rules evaluate against authored PDF dimensions, may nest up to the generated limit, and cannot contain `size`.

State the cascade and value behavior precisely:

- `!important` wins first, then specificity, then later source order.
- For a selector list, the highest-specificity branch that actually matches the node is used.
- `:where()` contributes zero specificity; `:is()` and `:not()` use their most specific nested selector.
- `inherit` reads the semantic parent's resolved value.
- `initial` removes the authored value.
- `unset` inherits inherited properties and removes non-inherited properties.
- `revert` restores the template/builder base value.
- Author custom properties inherit through the semantic tree; `var()` supports nested fallbacks.
- Missing variables without fallbacks and variable cycles are errors.
- `--resume-*` variables are read-only runtime values; author variables must use another prefix.
- Units resolve against PDF points, authored page dimensions, the root font size, or the current/parent font size as appropriate.

State PDF and lifecycle behavior precisely:

- `display: none` hides an existing semantic node; Semantic CSS never deletes source data.
- `order` changes stable sibling render order, with original semantic order as the tie-breaker.
- `break-before`, `break-inside`, `-resume-min-presence-ahead`, `orphans`, `widows`, and `-resume-fixed` map to bounded React PDF behavior.
- `size` applies only to `page` outside `@media`; one or two lengths create a custom page size.
- Semantic CSS cannot create, re-parent, or duplicate arbitrary nodes; fixed content repeats only an existing semantic node.
- Invalid editable source remains saved, while preview and export keep the last source that compiled and passed PDF preflight.
- Template-part selectors are optional and must be guarded with `resume[template="..."]` when portability matters.

End with an explicit unsupported checklist: class selectors, pseudo-elements, CSS Grid, `@import`, `@font-face`, `@supports`, arbitrary at-rules, `url()`, external/local assets, font loading, scripts, interaction states, animations, transitions, filters, gradients, general `box-shadow`/`text-shadow`, browser layout APIs, and node creation are unsupported. Note that picture shadows are available only through `-resume-shadow-color` and `-resume-shadow-width`.

Mark one invalid complete example:

````mdx
<!-- SEMANTIC-CSS-EXAMPLE:invalid INVALID_SELECTOR -->
```css
@version 1;

section::before {
	content: "Unsupported";
}
```
````

Explain that pseudo-elements cannot create PDF nodes.

- [ ] **Step 2: Add generated sections at their lookup locations**

Place each exact marker pair once:

```md
<!-- SEMANTIC-CSS-SEMANTIC-ELEMENTS:START -->
<!-- SEMANTIC-CSS-SEMANTIC-ELEMENTS:END -->
```

Repeat for properties, system variables, template parts, diagnostics, and limits. Keep manual explanations immediately before or after their table, not inside generated blocks.

- [ ] **Step 3: Add exact author recipes**

Each recipe starts with `@version 1;` and is independently copyable:

```css
/* One section type */
@version 1;

section[type="experience"] section-heading {
	color: #0f766e;
}
```

```css
/* One resume-specific node */
@version 1;

#experience-item-uuid {
	break-inside: avoid;
}
```

```css
/* Sidebar content */
@version 1;

region[placement="sidebar"] {
	background-color: #f8fafc;
	padding: 18pt;
}
```

```css
/* Rich-text list row versus content */
@version 1;

list-item {
	gap: 4pt;
}

list-marker {
	color: var(--resume-primary-color);
}

list-item-content {
	line-height: 1.35;
}
```

```css
/* Authored page dimensions */
@version 1;

page {
	size: 210mm 297mm;
}
```

```css
/* Pagination */
@version 1;

section {
	-resume-min-presence-ahead: 72pt;
}

item {
	break-inside: avoid;
}
```

```css
/* Template decoration */
@version 1;

resume[template="azurill"] template-part[name="timeline-line"] {
	background-color: #94a3b8;
}
```

```css
/* PDF dimension query */
@version 1;

@media (max-width: 600pt) {
	region[placement="sidebar"] {
		padding: 12pt;
	}
}
```

Prefix each complete recipe fence with `<!-- SEMANTIC-CSS-EXAMPLE:valid -->`; leave only deliberately incomplete syntax fragments unmarked.

- [ ] **Step 4: Test examples directly from the page**

First add the committed-output synchronization test:

```ts
it("keeps every committed generated document synchronized", async () => {
	const before = await readTargets(defaultDocumentationPaths);
	await updateGeneratedDocumentation(defaultDocumentationPaths);
	expect(await readTargets(defaultDocumentationPaths)).toEqual(before);
});
```

Then extract fenced CSS immediately following:

```text
<!-- SEMANTIC-CSS-EXAMPLE:valid -->
<!-- SEMANTIC-CSS-EXAMPLE:invalid CODE -->
```

For valid examples:

```ts
const result = compileStylesheet({ languageVersion: 1, text: example.source });
expect(result.program, example.label).not.toBeNull();
expect(result.diagnostics.filter(({ severity }) => severity === "error"), example.label).toEqual([]);
```

For invalid examples:

```ts
expect(result.diagnostics.map(({ code }) => code)).toContain(example.expectedCode);
```

- [ ] **Step 5: Add the schema guide marker and docs navigation**

Wrap only the full JSON code fence in:

```md
<!-- RESUME-JSON-SCHEMA:START -->
<!-- RESUME-JSON-SCHEMA:END -->
```

In `docs/docs.json`, insert:

```json
"guides/using-custom-styles",
"guides/semantic-css-reference",
"guides/using-ai-in-the-builder"
```

- [ ] **Step 6: Regenerate every artifact**

Run:

```bash
pnpm docs:gen
pnpm docs:gen
git diff --check -- docs/guides/semantic-css-reference.mdx docs/guides/json-resume-schema.mdx skills/resume-builder/references/schema.md docs/spec.json
```

Expected: the first run updates all four artifact groups; the second run is byte-for-byte idempotent as proved by the determinism and synchronization tests. `docs/spec.json` contains version `5.2.4` and server URL `https://rxresu.me/api/openapi`.

- [ ] **Step 7: Run focused documentation verification**

Run:

```bash
pnpm --filter @reactive-resume/tooling test -- semantic-css/generate-reference.test.ts
pnpm --filter @reactive-resume/tooling typecheck
pnpm exec markdownlint-cli2 docs/guides/semantic-css-reference.mdx docs/guides/json-resume-schema.mdx skills/resume-builder/references/schema.md
```

Expected: PASS.

- [ ] **Step 8: Commit the author references and generated artifacts**

```bash
git add docs/guides/semantic-css-reference.mdx docs/guides/json-resume-schema.mdx skills/resume-builder/references/schema.md docs/spec.json docs/docs.json tooling/semantic-css/generate-reference.test.ts
git diff --cached --check
git diff --cached
git commit -m "docs: publish the Semantic CSS author reference"
```

---

### Task 6: Link the Reference from Custom Styles

**Files:**
- Modify: `apps/web/src/features/resume/stylesheet/editor.tsx`
- Modify: `apps/web/src/features/resume/stylesheet/editor.test.tsx`

**Interfaces:**
- Consumes: the fixed public URL `https://docs.rxresu.me/guides/semantic-css-reference`.
- Produces: one translated, accessible link in shared editor chrome on desktop and mobile.

- [ ] **Step 1: Write the failing desktop and mobile link assertions**

Add a helper:

```ts
const referenceName = /browse the semantic css language reference.*opens in new tab/i;

const expectReferenceLink = (root: HTMLElement) => {
	const link = within(root).getByRole("link", { name: referenceName });
	expect(link).toHaveAttribute("href", "https://docs.rxresu.me/guides/semantic-css-reference");
	expect(link).toHaveAttribute("target", "_blank");
	expect(link).toHaveAttribute("rel", "noopener noreferrer");
};
```

In a desktop test, render `StylesheetEditorShell` and call `expectReferenceLink(container)`.

In the existing mobile-sheet test, after opening the sheet:

```ts
expectReferenceLink(sheet);
```

- [ ] **Step 2: Run the focused editor test and verify failure**

Run:

```bash
pnpm --filter web test -- src/features/resume/stylesheet/editor.test.tsx
```

Expected: FAIL because the reference link is absent.

- [ ] **Step 3: Add the local help hint**

Import `BookOpenIcon` from the existing icon package and render this immediately after `StylesheetToolbar` and before the editor:

```tsx
<p className="flex items-center gap-1.5 text-muted-foreground text-xs">
	<BookOpenIcon aria-hidden="true" className="shrink-0" />
	<span>
		<Trans>Not sure what to write?</Trans>{" "}
		<a
			className="text-primary underline underline-offset-4"
			href="https://docs.rxresu.me/guides/semantic-css-reference"
			target="_blank"
			rel="noopener noreferrer"
		>
			<Trans>Browse the Semantic CSS language reference.</Trans>
			<span className="sr-only">
				{" "}
				(<Trans>opens in new tab</Trans>)
			</span>
		</a>
	</span>
</p>
```

Do not add props, a URL constant, or a shared component. The existing `editorChrome` reuse makes the hint available in both desktop and mobile focus mode.

- [ ] **Step 4: Run focused web tests and typecheck**

Run:

```bash
pnpm --filter web test -- src/features/resume/stylesheet/editor.test.tsx
pnpm --filter web typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit only the help-hint hunks**

Both files already have worktree changes, so use interactive staging and inspect the cached patch:

```bash
git add -p apps/web/src/features/resume/stylesheet/editor.tsx apps/web/src/features/resume/stylesheet/editor.test.tsx
git diff --cached --check
git diff --cached
git commit -m "feat: link Custom Styles to Semantic CSS reference"
```

---

### Task 7: Final Non-Chrome Verification

**Files:**
- Verify only; fix failures in the owning task's files.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: one clean, repeatable documentation generation and focused repository gates.

- [ ] **Step 1: Verify generation is deterministic and committed**

```bash
pnpm docs:gen
git diff --exit-code -- docs/guides/semantic-css-reference.mdx docs/guides/json-resume-schema.mdx skills/resume-builder/references/schema.md docs/spec.json
```

Expected: PASS with no generated diff.

- [ ] **Step 2: Run focused tests**

```bash
pnpm --filter @reactive-resume/schema test -- src/resume/json-schema.test.ts
pnpm --filter @reactive-resume/resume test -- src/stylesheet/registry/semantic.test.ts src/stylesheet/values.test.ts
pnpm --filter @reactive-resume/pdf test -- src/semantic/template-manifest.test.ts src/semantic/preflight-core.test.tsx
pnpm --filter @reactive-resume/tooling test -- semantic-css/generate-reference.test.ts
pnpm --filter server test -- src/openapi/generator.test.ts src/http/app.test.ts src/services/stylesheet-preflight.test.ts
pnpm --filter web test -- src/features/resume/stylesheet/editor.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run typechecks and package boundaries**

```bash
pnpm --filter @reactive-resume/schema typecheck
pnpm --filter @reactive-resume/resume typecheck
pnpm --filter @reactive-resume/pdf typecheck
pnpm --filter @reactive-resume/tooling typecheck
pnpm --filter server typecheck
pnpm --filter web typecheck
pnpm exec turbo boundaries
```

Expected: PASS.

- [ ] **Step 4: Run non-mutating formatting and documentation checks**

```bash
pnpm exec biome check packages/schema/src/resume/json-schema.ts packages/schema/src/resume/json-schema.test.ts apps/server/src/static/schema.ts apps/server/src/openapi apps/server/src/services/stylesheet-preflight.ts packages/resume/src/stylesheet packages/pdf/src/semantic packages/pdf/src/server.tsx tooling/semantic-css apps/web/src/features/resume/stylesheet/editor.tsx apps/web/src/features/resume/stylesheet/editor.test.tsx
pnpm exec markdownlint-cli2 docs/guides/semantic-css-reference.mdx docs/guides/json-resume-schema.mdx skills/resume-builder/references/schema.md docs/superpowers/plans/2026-07-29-semantic-css-reference-and-docs-generation.md
git diff --check
```

Expected: PASS. Do not run `pnpm check`, because it mutates the entire worktree.

- [ ] **Step 5: Inspect scope without using Chrome**

```bash
git status --short
git diff --stat
git log --oneline -8
```

Confirm:

- No Chrome or Playwright browser session was used.
- Unrelated pre-existing changes remain present and were not reverted.
- Generated artifacts are synchronized.
- The public link, nav entry, production OpenAPI URL, and root version are exact.
