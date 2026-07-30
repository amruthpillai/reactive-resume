import type { JsonSchema } from "./generate-reference";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it } from "vitest";
import { compileStylesheet } from "@reactive-resume/resume/stylesheet";
import { createResumeDataJsonSchema } from "@reactive-resume/schema/resume/json-schema";
import {
	buildGeneratedDocumentation,
	renderSchemaReference,
	replaceGeneratedBlock,
	updateGeneratedDocumentation,
} from "./generate-reference";

const temporaryDirectories: string[] = [];
const defaultDocumentationPaths = {
	jsonSchemaGuide: fileURLToPath(new URL("../../docs/guides/json-resume-schema.mdx", import.meta.url)),
	skillSchemaReference: fileURLToPath(new URL("../../skills/resume-builder/references/schema.md", import.meta.url)),
};
const applyingCustomStylesGuide = fileURLToPath(new URL("../../docs/applying-custom-styles.mdx", import.meta.url));

type RrssExample = { label: string; source: string };

afterEach(async () => {
	await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

const readTargets = (paths: typeof defaultDocumentationPaths) =>
	Promise.all(Object.values(paths).map((path) => readFile(path, "utf8")));

function extractRrssExamples(source: string): RrssExample[] {
	const examples: RrssExample[] = [];
	const matches = source.matchAll(
		/<!-- RRSS-EXAMPLE:valid(?: ([A-Z][A-Z0-9_]*))? -->\r?\n```css\r?\n([\s\S]*?)\r?\n```/g,
	);

	for (const [, markerLabel, example] of matches) {
		if (!example) throw new Error("Invalid RRSS example marker.");
		examples.push({ label: markerLabel ?? `valid example ${examples.length + 1}`, source: example });
	}

	return examples;
}

async function createDocumentationPaths() {
	const directory = await mkdtemp(join(tmpdir(), "generated-documentation-"));
	temporaryDirectories.push(directory);
	const paths = {
		jsonSchemaGuide: join(directory, "json-resume-schema.mdx"),
		skillSchemaReference: join(directory, "schema.md"),
	};

	await Promise.all([
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
	expect(reference).toContain("| `items[]` | variant 1 | — | `{ company }` |");
	expect(reference).toContain("| `items[]` | variant 2 | — | `{ school }` |");
	expect(reference).toContain("| `items[].company` | `string` | yes (variant 1 at items[]) |");
	expect(reference).toContain("| `items[].position` | `string` | no (variant 1 at items[]) |");
	expect(reference).toContain("| `items[].school` | `string` | yes (variant 2 at items[]) |");
	expect(reference).not.toContain("| `items[].school` | `string` | yes |");
});

it("names every custom-section item shape by its type key", () => {
	const reference = renderSchemaReference(createResumeDataJsonSchema() as JsonSchema);
	const expectedSchemas = {
		summary: "summaryItemSchema",
		profiles: "profileItemSchema",
		experience: "experienceItemSchema",
		education: "educationItemSchema",
		projects: "projectItemSchema",
		skills: "skillItemSchema",
		languages: "languageItemSchema",
		interests: "interestItemSchema",
		awards: "awardItemSchema",
		certifications: "certificationItemSchema",
		publications: "publicationItemSchema",
		volunteer: "volunteerItemSchema",
		references: "referenceItemSchema",
		"cover-letter": "coverLetterItemSchema",
	};

	for (const [type, schemaName] of Object.entries(expectedSchemas)) {
		expect(reference).toContain(`| \`customSections[]\` | \`${type}\` | \`${schemaName}\` |`);
	}
	expect(reference).toContain(
		"| `customSections[]` | `experience` | `experienceItemSchema` | `{ id, hidden, company, position, location, period, description }` |",
	);
	expect(reference).toContain(
		"| `customSections[].items[].company` | `string` | yes (type experience, schema experienceItemSchema at customSections[]) |",
	);
	expect(reference).not.toMatch(/\| `customSections\[\]` \| variant \d+/);
});

it("derives top-level required fields and renders canonical exclusive minimum constraints", () => {
	const reference = renderSchemaReference({
		type: "object",
		properties: {
			languageVersion: { type: "integer", exclusiveMinimum: 0, maximum: 1 },
			optional: { type: "string" },
		},
		required: ["languageVersion"],
	});
	const requiredSection = reference.slice(
		reference.indexOf("## Required top-level fields"),
		reference.indexOf("## Union variant shapes"),
	);

	expect(requiredSection).toContain("`languageVersion`");
	expect(requiredSection).not.toContain("`picture`");
	expect(reference).toContain("| `languageVersion` | `integer` | yes | exclusiveMinimum: 0; maximum: 1 |");
});

it("does not write any output when one source is invalid", async () => {
	const paths = await createDocumentationPaths();
	await writeFile(paths.jsonSchemaGuide, "missing markers\n");
	const before = await Promise.all(Object.values(paths).map((path) => readFile(path, "utf8")));

	await expect(updateGeneratedDocumentation(paths)).rejects.toThrow(/Missing generated markers/);
	expect(await Promise.all(Object.values(paths).map((path) => readFile(path, "utf8")))).toEqual(before);
});

it("keeps every committed generated document synchronized", async () => {
	const [jsonSchemaGuide, skillSchemaReference] = await readTargets(defaultDocumentationPaths);

	expect(await buildGeneratedDocumentation(defaultDocumentationPaths)).toEqual({
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
	expect(authoredGuide).not.toMatch(/custom sections.*arbitrary content/is);
});

it("compiles every marked valid RRSS example", async () => {
	const source = await readFile(applyingCustomStylesGuide, "utf8");
	const examples = extractRrssExamples(source);
	expect(examples).not.toEqual([]);

	for (const example of examples) {
		const result = compileStylesheet({ languageVersion: 1, text: example.source });
		expect(result.program, example.label).not.toBeNull();
		expect(
			result.diagnostics.filter(({ severity }) => severity === "error"),
			example.label,
		).toEqual([]);
	}
});
