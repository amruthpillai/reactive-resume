import type { SemanticNode } from "@reactive-resume/resume/stylesheet/types";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it } from "vitest";
import { getTemplateSemanticRegistryFingerprintInput } from "@reactive-resume/pdf/semantic-manifest";
import { buildSemanticTree } from "@reactive-resume/pdf/semantic-tree";
import { compileSelector, compileStylesheet, matchesSelector } from "@reactive-resume/resume/stylesheet";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createResumeDataJsonSchema } from "@reactive-resume/schema/resume/json-schema";
import {
	buildGeneratedDocumentation,
	renderSchemaReference,
	renderTemplateParts,
	replaceGeneratedBlock,
	updateGeneratedDocumentation,
} from "./generate-reference";

const temporaryDirectories: string[] = [];
const rrssMarkers = [
	"RRSS-SEMANTIC-ELEMENTS",
	"RRSS-PROPERTIES",
	"RRSS-SYSTEM-VARIABLES",
	"RRSS-TEMPLATE-PARTS",
	"RRSS-DIAGNOSTICS",
	"RRSS-LIMITS",
];
const defaultDocumentationPaths = {
	rrssReference: fileURLToPath(new URL("../../docs/guides/semantic-css-reference.mdx", import.meta.url)),
	jsonSchemaGuide: fileURLToPath(new URL("../../docs/guides/json-resume-schema.mdx", import.meta.url)),
	skillSchemaReference: fileURLToPath(new URL("../../skills/resume-builder/references/schema.md", import.meta.url)),
};

type RrssExample =
	| { kind: "valid"; label: string; markerLabel?: string; source: string }
	| { kind: "invalid"; label: string; source: string; expectedCode: string };

afterEach(async () => {
	await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

const readTargets = (paths: typeof defaultDocumentationPaths) =>
	Promise.all(Object.values(paths).map((path) => readFile(path, "utf8")));
const flattenTree = (node: SemanticNode): SemanticNode[] => [node, ...node.children.flatMap(flattenTree)];

function extractRrssExamples(source: string): RrssExample[] {
	const examples: RrssExample[] = [];
	const matches = source.matchAll(
		/<!-- RRSS-EXAMPLE:(valid|invalid)(?: ([A-Z][A-Z0-9_]*))? -->\r?\n```css\r?\n([\s\S]*?)\r?\n```/g,
	);

	for (const [, marker, markerLabel, example] of matches) {
		if (!marker || !example) throw new Error("Invalid RRSS example marker.");
		const label = markerLabel ?? `${marker} example ${examples.length + 1}`;
		if (marker === "valid") {
			examples.push({ kind: "valid", label, ...(markerLabel ? { markerLabel } : {}), source: example });
		} else {
			if (!markerLabel) throw new Error(`Missing diagnostic code for ${label}.`);
			examples.push({ kind: "invalid", label, source: example, expectedCode: markerLabel });
		}
	}

	return examples;
}

async function createDocumentationPaths() {
	const directory = await mkdtemp(join(tmpdir(), "generated-documentation-"));
	temporaryDirectories.push(directory);
	const paths = {
		rrssReference: join(directory, "semantic-css-reference.mdx"),
		jsonSchemaGuide: join(directory, "json-resume-schema.mdx"),
		skillSchemaReference: join(directory, "schema.md"),
	};

	await Promise.all([
		writeFile(
			paths.rrssReference,
			rrssMarkers.map((name) => `<!-- ${name}:START -->\nold\n<!-- ${name}:END -->`).join("\n"),
		),
		writeFile(
			paths.jsonSchemaGuide,
			"before\n<!-- RESUME-JSON-SCHEMA:START -->\nold\n<!-- RESUME-JSON-SCHEMA:END -->\nafter\n",
		),
		writeFile(paths.skillSchemaReference, "old skill reference\n"),
	]);

	return paths;
}

it("rejects missing, duplicate, and out-of-order generated markers", () => {
	expect(() => replaceGeneratedBlock("plain text", "RRSS-ELEMENTS", "body", "reference.mdx")).toThrow(
		/Missing generated markers/,
	);
	expect(() =>
		replaceGeneratedBlock(
			"<!-- RRSS-ELEMENTS:START --><!-- RRSS-ELEMENTS:END --><!-- RRSS-ELEMENTS:START --><!-- RRSS-ELEMENTS:END -->",
			"RRSS-ELEMENTS",
			"body",
			"reference.mdx",
		),
	).toThrow(/Duplicate generated markers/);
	expect(() =>
		replaceGeneratedBlock(
			"<!-- RRSS-ELEMENTS:END --><!-- RRSS-ELEMENTS:START -->",
			"RRSS-ELEMENTS",
			"body",
			"reference.mdx",
		),
	).toThrow(/out of order/);
});

it("builds identical output twice", async () => {
	const paths = await createDocumentationPaths();

	expect(await buildGeneratedDocumentation(paths)).toEqual(await buildGeneratedDocumentation(paths));
});

it("emits selectors that match every runtime alias on manifest-applied semantic trees", () => {
	const manifests = getTemplateSemanticRegistryFingerprintInput();
	const table = renderTemplateParts(manifests);
	const data = structuredClone(defaultResumeData);
	data.basics = {
		name: "Ada Lovelace",
		headline: "Engineer",
		email: "ada@example.com",
		phone: "",
		location: "London",
		website: { url: "", label: "" },
		customFields: [],
	};
	data.sections.experience.items = [
		{
			id: "experience/1",
			hidden: false,
			company: "Analytical Engines",
			position: "Engineer",
			location: "London",
			period: "1842",
			website: { url: "", label: "", inlineLink: false },
			description: "<p>Built algorithms.</p>",
			roles: [],
		},
	];

	for (const [template, manifest] of Object.entries(manifests)) {
		const tree = buildSemanticTree({
			data,
			template: manifest.template,
			page: { fullWidth: false, main: ["experience"], sidebar: ["skills"] },
			pageNumber: 1,
			showHeader: true,
		});
		for (const part of manifest.parts) {
			const binding = part.binding;
			if (binding.type === "primitive") continue;
			const row = table.split("\n").find((line) => line.startsWith(`| \`${template}\` | \`${part.name}\` |`));
			const selectorSource = row?.split(" | ")[2]?.slice(1, -1);
			const owner = flattenTree(tree).find(
				(node) =>
					node.kind === binding.canonicalKind && node.attributes.part?.split(" ").includes(binding.token) === true,
			);
			const compiled = selectorSource ? compileSelector(selectorSource) : { selector: null };

			expect(selectorSource).toBe(`${binding.canonicalKind}[part~="${binding.token}"]`);
			expect(compiled.selector, `${template}:${part.name}`).not.toBeNull();
			expect(owner, `${template}:${part.name}`).toBeDefined();
			expect(
				compiled.selector && owner ? matchesSelector(compiled.selector, tree, owner.key) : false,
				`${template}:${part.name}`,
			).toBe(true);
		}
	}
});

it("includes every template in the matrix even when it has no template-specific parts", () => {
	const manifests = getTemplateSemanticRegistryFingerprintInput();
	const table = renderTemplateParts(manifests);

	for (const [template, manifest] of Object.entries(manifests)) {
		expect(table).toContain(`| \`${template}\` |`);
		if (manifest.parts.length === 0) {
			expect(table).toContain(`| \`${template}\` | no template-specific parts | — | — | — |`);
		}
	}
});

it("labels union requiredness by variant and emits representative variant shapes", () => {
	const reference = renderSchemaReference({
		type: "object",
		properties: {
			items: {
				type: "array",
				items: {
					anyOf: [
						{
							type: "object",
							properties: {
								company: { type: "string" },
								position: { type: "string" },
							},
							required: ["company"],
						},
						{
							type: "object",
							properties: {
								school: { type: "string" },
								degree: { type: "string" },
							},
							required: ["school"],
						},
					],
				},
			},
		},
		required: ["items"],
	});

	expect(reference).toContain("Required fields are local to that variant");
	expect(reference).toContain("| `items[]` | variant 1 | `{ company }` |");
	expect(reference).toContain("| `items[]` | variant 2 | `{ school }` |");
	expect(reference).toContain("| `items[].company` | `string` | yes (variant 1 at items[]) |");
	expect(reference).toContain("| `items[].position` | `string` | no (variant 1 at items[]) |");
	expect(reference).toContain("| `items[].school` | `string` | yes (variant 2 at items[]) |");
	expect(reference).not.toContain("| `items[].school` | `string` | yes |");
});

it("does not write any output when one source is invalid", async () => {
	const paths = await createDocumentationPaths();
	await writeFile(paths.jsonSchemaGuide, "missing markers\n");
	const before = await Promise.all(Object.values(paths).map((path) => readFile(path, "utf8")));

	await expect(updateGeneratedDocumentation(paths)).rejects.toThrow(/Missing generated markers/);
	expect(await Promise.all(Object.values(paths).map((path) => readFile(path, "utf8")))).toEqual(before);
});

it("keeps every committed generated document synchronized", async () => {
	const [rrssReference, jsonSchemaGuide, skillSchemaReference] = await readTargets(defaultDocumentationPaths);

	expect(await buildGeneratedDocumentation(defaultDocumentationPaths)).toEqual({
		rrssReference,
		jsonSchemaGuide,
		skillSchemaReference,
	});
});

it("keeps the schema guide aligned with the canonical schema contract", async () => {
	const guide = await readFile(defaultDocumentationPaths.jsonSchemaGuide, "utf8");
	const authoredGuide = guide.slice(0, guide.indexOf("<!-- RESUME-JSON-SCHEMA:START -->"));
	const schema = createResumeDataJsonSchema();

	expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
	expect(schema.properties).not.toHaveProperty("version");
	expect(authoredGuide).toContain("draft 2020-12");
	expect(authoredGuide).toContain("Resume documents do not include a top-level `version` property.");
	expect(authoredGuide).not.toMatch(/draft 0?7/i);
	expect(authoredGuide).not.toMatch(/"version"\s*:/);
});

it("compiles every marked RRSS example", async () => {
	const source = await readFile(defaultDocumentationPaths.rrssReference, "utf8");
	const examples = extractRrssExamples(source);
	expect(examples.some(({ kind }) => kind === "valid")).toBe(true);
	expect(examples.some(({ kind }) => kind === "invalid")).toBe(true);
	expect(
		examples.flatMap((example) => (example.kind === "valid" && example.markerLabel ? [example.markerLabel] : [])),
	).toEqual(
		expect.arrayContaining([
			"SELECTOR_ESCAPING",
			"FLEX_VALUES",
			"IMAGE_VALUES",
			"TRANSFORM_VALUES",
			"COLOR_FUNCTIONS",
			"SHORTHANDS",
			"PROPERTY_VALUES",
		]),
	);

	for (const example of examples) {
		const result = compileStylesheet({ languageVersion: 1, text: example.source });
		if (example.kind === "valid") {
			expect(result.program, example.label).not.toBeNull();
			expect(
				result.diagnostics.filter(({ severity }) => severity === "error"),
				example.label,
			).toEqual([]);
		} else {
			expect(
				result.diagnostics.map(({ code }) => code),
				example.label,
			).toContain(example.expectedCode);
		}
	}
});
