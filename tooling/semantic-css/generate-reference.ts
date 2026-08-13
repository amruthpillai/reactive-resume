import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
	createCustomSectionItemJsonSchemas,
	createResumeDataJsonSchema,
} from "@reactive-resume/schema/resume/json-schema";

export type DocumentationPaths = {
	jsonSchemaGuide: string;
	skillSchemaReference: string;
};

export type JsonSchema = {
	type?: string | readonly string[];
	properties?: Readonly<Record<string, JsonSchema>>;
	required?: readonly string[];
	items?: JsonSchema;
	anyOf?: readonly JsonSchema[];
	oneOf?: readonly JsonSchema[];
	enum?: readonly unknown[];
	const?: unknown;
	minimum?: number;
	exclusiveMinimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
	default?: unknown;
	description?: string;
};

const defaultPaths: DocumentationPaths = {
	jsonSchemaGuide: fileURLToPath(new URL("../../docs/guides/json-resume-schema.mdx", import.meta.url)),
	skillSchemaReference: fileURLToPath(new URL("../../skills/resume-builder/references/schema.md", import.meta.url)),
};

const markdown = (value: unknown) => String(value).replaceAll("|", "\\|").replaceAll(/\r?\n/g, " ");
const code = (value: unknown) => `\`${markdown(value)}\``;
const list = (values: readonly unknown[]) => (values.length ? values.map(code).join(", ") : "—");
const sentenceList = (values: readonly unknown[]) => {
	if (values.length < 2) return list(values);
	if (values.length === 2) return `${code(values[0])} and ${code(values[1])}`;
	return `${values.slice(0, -1).map(code).join(", ")}, and ${code(values.at(-1))}`;
};
const table = (headers: readonly string[], rows: readonly string[]) =>
	[`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows].join("\n");

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

function schemaType(schema: JsonSchema): string {
	const union = schema.anyOf ?? schema.oneOf;
	if (union) return union.map(schemaType).join(" or ");
	return typeof schema.type === "string" ? schema.type : (schema.type?.join(" or ") ?? "any");
}

function schemaConstraints(schema: JsonSchema) {
	const constraints = [
		schema.enum && `enum: ${JSON.stringify(schema.enum)}`,
		schema.minimum !== undefined && `minimum: ${schema.minimum}`,
		schema.exclusiveMinimum !== undefined && `exclusiveMinimum: ${schema.exclusiveMinimum}`,
		schema.maximum !== undefined && `maximum: ${schema.maximum}`,
		schema.minLength !== undefined && `minLength: ${schema.minLength}`,
		schema.maxLength !== undefined && `maxLength: ${schema.maxLength}`,
		schema.default !== undefined && `default: ${JSON.stringify(schema.default)}`,
	].filter((constraint): constraint is string => Boolean(constraint));
	return markdown(constraints.join("; ") || "—");
}

type VariantContext = {
	label: string;
	path: string;
};

const variantLabel = ({ label, path }: VariantContext) => `${label} at ${path}`;

export function renderSchemaReference(schema: JsonSchema) {
	const rows: string[] = [];
	const seen = new Set<string>();
	const variantRows: string[] = [];
	const customSectionItemSchemas = createCustomSectionItemJsonSchemas();

	const visit = (
		node: JsonSchema,
		path: string,
		required: boolean | null,
		variants: readonly VariantContext[] = [],
	) => {
		const type = schemaType(node);
		const key = `${path}\0${type}\0${variants.map(variantLabel).join("\0")}`;
		if (!seen.has(key)) {
			seen.add(key);
			const requiredness = required === null ? "—" : required ? "yes" : "no";
			const variant = variants.map(variantLabel).join("; ");
			rows.push(
				`| ${code(path)} | ${code(type)} | ${requiredness}${variant ? ` (${variant})` : ""} | ${schemaConstraints(node)} | ${markdown(node.description ?? "—")} |`,
			);
		}

		const requiredProperties = new Set(node.required ?? []);
		for (const [name, property] of Object.entries(node.properties ?? {})) {
			visit(property, path ? `${path}.${name}` : name, requiredProperties.has(name), variants);
		}
		if (node.items) visit(node.items, `${path}[]`, null, variants);
		const union = node.anyOf ?? node.oneOf ?? [];
		if (path === "customSections[]" && union.length > 0) {
			for (const [type, item] of Object.entries(customSectionItemSchemas)) {
				const branch = union.find((candidate) => candidate.properties?.type?.const === type);
				const itemSchema = branch?.properties?.items?.items;
				if (!branch || !itemSchema) {
					throw new Error(`Missing correlated custom section schema for type: ${type}`);
				}
				const shape =
					itemSchema.type === "object" ? `{ ${(itemSchema.required ?? []).join(", ")} }` : schemaType(itemSchema);
				const label = `type ${type}, schema ${item.schemaName}`;
				variantRows.push(`| ${code(path)} | ${code(type)} | ${code(item.schemaName)} | ${code(shape)} |`);
				visit(branch, path, required, [...variants, { label, path }]);
			}
			return;
		}
		for (const [branchIndex, branch] of union.entries()) {
			const label = `variant ${branchIndex + 1}`;
			const shape = branch.type === "object" ? `{ ${(branch.required ?? []).join(", ")} }` : schemaType(branch);
			variantRows.push(`| ${code(path)} | ${label} | — | ${code(shape)} |`);
			visit(branch, path, required, [...variants, { label, path }]);
		}
	};

	for (const [name, property] of Object.entries(schema.properties ?? {})) {
		visit(property, name, new Set(schema.required ?? []).has(name));
	}

	return [
		"# Reactive Resume Schema Reference",
		"",
		"Generated by `pnpm docs:gen` from `resumeDataSchema`. Do not edit this file directly.",
		"",
		"Canonical schema: https://rxresu.me/schema.json",
		"",
		"## Required top-level fields",
		"",
		sentenceList(schema.required ?? []),
		"",
		"## Union variant shapes",
		"",
		"Choose one coherent shape for each union value. Required fields are local to that variant; optional fields remain in the field catalog.",
		"",
		table(["Path", "Type/variant", "Item schema", "Representative required shape"], variantRows),
		"",
		"## Field catalog",
		"",
		table(["Path", "Type", "Required", "Constraints and default", "Description"], rows),
		"",
	].join("\n");
}

export async function buildGeneratedDocumentation(paths: Partial<DocumentationPaths> = {}) {
	const resolvedPaths = { ...defaultPaths, ...paths };
	const jsonSchemaSource = await readFile(resolvedPaths.jsonSchemaGuide, "utf8");
	const schema = createResumeDataJsonSchema() as JsonSchema;
	const fullSchemaBlock = ["```json /schema.json lines expandable", JSON.stringify(schema, null, "\t"), "```"].join(
		"\n",
	);

	return {
		jsonSchemaGuide: replaceGeneratedBlock(
			jsonSchemaSource,
			"RESUME-JSON-SCHEMA",
			fullSchemaBlock,
			resolvedPaths.jsonSchemaGuide,
		),
		skillSchemaReference: renderSchemaReference(schema),
	};
}

export async function updateGeneratedDocumentation(paths: Partial<DocumentationPaths> = {}): Promise<void> {
	const resolvedPaths = { ...defaultPaths, ...paths };
	const output = await buildGeneratedDocumentation(resolvedPaths);
	await Promise.all(
		(Object.keys(output) as (keyof DocumentationPaths)[]).map((name) => writeFile(resolvedPaths[name], output[name])),
	);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	await updateGeneratedDocumentation();
}
