import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it } from "vitest";
import { getTemplateSemanticRegistryFingerprintInput } from "@reactive-resume/pdf/semantic-manifest";
import { compileStylesheet } from "@reactive-resume/resume/stylesheet";
import {
	buildGeneratedDocumentation,
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
	| { kind: "valid"; label: string; source: string }
	| { kind: "invalid"; label: string; source: string; expectedCode: string };

afterEach(async () => {
	await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

const readTargets = (paths: typeof defaultDocumentationPaths) =>
	Promise.all(Object.values(paths).map((path) => readFile(path, "utf8")));

function extractRrssExamples(source: string): RrssExample[] {
	const examples: RrssExample[] = [];
	const matches = source.matchAll(
		/<!-- RRSS-EXAMPLE:(valid|invalid ([A-Z][A-Z0-9_]*)) -->\r?\n```css\r?\n([\s\S]*?)\r?\n```/g,
	);

	for (const [, marker, expectedCode, example] of matches) {
		if (!marker || !example) throw new Error("Invalid RRSS example marker.");
		const label = `${marker} example ${examples.length + 1}`;
		if (marker === "valid") examples.push({ kind: "valid", label, source: example });
		else {
			if (!expectedCode) throw new Error(`Missing diagnostic code for ${label}.`);
			examples.push({ kind: "invalid", label, source: example, expectedCode });
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

it("documents every manifest part with its real selector form", () => {
	const manifests = getTemplateSemanticRegistryFingerprintInput();
	const table = renderTemplateParts(manifests);

	for (const [template, manifest] of Object.entries(manifests)) {
		for (const part of manifest.parts) {
			const selector =
				part.binding.type === "primitive"
					? `template-part[name="${part.name}"]`
					: `${part.binding.canonicalKind}[role~="${part.binding.token}"]`;
			expect(table).toContain(`| \`${template}\``);
			expect(table).toContain(`\`${part.name}\``);
			expect(table).toContain(`\`${selector}\``);
		}
	}
});

it("does not write any output when one source is invalid", async () => {
	const paths = await createDocumentationPaths();
	await writeFile(paths.jsonSchemaGuide, "missing markers\n");
	const before = await Promise.all(Object.values(paths).map((path) => readFile(path, "utf8")));

	await expect(updateGeneratedDocumentation(paths)).rejects.toThrow(/Missing generated markers/);
	expect(await Promise.all(Object.values(paths).map((path) => readFile(path, "utf8")))).toEqual(before);
});

it("keeps every committed generated document synchronized", async () => {
	const before = await readTargets(defaultDocumentationPaths);
	await updateGeneratedDocumentation(defaultDocumentationPaths);
	expect(await readTargets(defaultDocumentationPaths)).toEqual(before);
});

it("compiles every marked RRSS example", async () => {
	const source = await readFile(defaultDocumentationPaths.rrssReference, "utf8");
	const examples = extractRrssExamples(source);
	expect(examples.some(({ kind }) => kind === "valid")).toBe(true);
	expect(examples.some(({ kind }) => kind === "invalid")).toBe(true);

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
