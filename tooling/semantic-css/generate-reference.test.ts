import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { getTemplateSemanticRegistryFingerprintInput } from "@reactive-resume/pdf/semantic-manifest";
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

afterEach(async () => {
	await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

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
