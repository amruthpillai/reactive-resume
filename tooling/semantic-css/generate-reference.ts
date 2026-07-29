import type { TemplateSemanticManifest } from "@reactive-resume/pdf/semantic-manifest";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
	PDF_PREFLIGHT_DIAGNOSTIC_CATALOG,
	STYLESHEET_PREFLIGHT_LIMITS,
} from "@reactive-resume/pdf/preflight-reference";
import { getTemplateSemanticRegistryFingerprintInput } from "@reactive-resume/pdf/semantic-manifest";
import {
	PROPERTY_REGISTRY_V1,
	RRSS_DIAGNOSTIC_CATALOG_V1,
	RRSS_LIMITS_V1,
	SEMANTIC_NODE_KINDS,
	SEMANTIC_REGISTRY_V1,
	SYSTEM_VARIABLE_REGISTRY_V1,
	TEMPLATE_PART_CHILD_KINDS_V1,
} from "@reactive-resume/resume/stylesheet";
import { createResumeDataJsonSchema } from "@reactive-resume/schema/resume/json-schema";

export type DocumentationPaths = {
	rrssReference: string;
	jsonSchemaGuide: string;
	skillSchemaReference: string;
};

type JsonSchema = {
	type?: string | readonly string[];
	properties?: Readonly<Record<string, JsonSchema>>;
	required?: readonly string[];
	items?: JsonSchema;
	anyOf?: readonly JsonSchema[];
	oneOf?: readonly JsonSchema[];
	enum?: readonly unknown[];
	minimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
	default?: unknown;
	description?: string;
};

const defaultPaths: DocumentationPaths = {
	rrssReference: fileURLToPath(new URL("../../docs/guides/semantic-css-reference.mdx", import.meta.url)),
	jsonSchemaGuide: fileURLToPath(new URL("../../docs/guides/json-resume-schema.mdx", import.meta.url)),
	skillSchemaReference: fileURLToPath(new URL("../../skills/resume-builder/references/schema.md", import.meta.url)),
};

const markdown = (value: unknown) => String(value).replaceAll("|", "\\|").replaceAll(/\r?\n/g, " ");
const code = (value: unknown) => `\`${markdown(value)}\``;
const list = (values: readonly unknown[]) => (values.length ? values.map(code).join(", ") : "—");
const table = (headers: readonly string[], rows: readonly string[]) =>
	[`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows].join("\n");
const sortedEntries = <T>(record: Readonly<Record<string, T>>) =>
	Object.entries(record).sort(([left], [right]) => left.localeCompare(right));

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

function renderSemanticElements() {
	const rows = [...SEMANTIC_NODE_KINDS].sort().map((kind) => {
		const definition = SEMANTIC_REGISTRY_V1[kind];
		const attributeValues: Readonly<Record<string, readonly string[]>> =
			"attributeValues" in definition ? definition.attributeValues : {};
		const knownValues = Object.entries(attributeValues).map(
			([attribute, values]) => `${code(attribute)}: ${list(values)}`,
		);
		return `| ${code(kind)} | ${list(definition.parents)} | ${list(definition.attributes)} | ${knownValues.join("; ") || "—"} | ${list(definition.roles)} |`;
	});

	return table(["Element", "Parents", "Attributes", "Known values", "Roles"], rows);
}

function renderProperties() {
	const rows = Object.entries(PROPERTY_REGISTRY_V1)
		.filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => entry[1] !== undefined)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(
			([name, definition]) =>
				`| ${code(name)} | ${markdown(definition.category)} | ${list(definition.appliesTo)} | ${definition.inheritable ? "yes" : "no"} | ${list(definition.units)} | ${list(definition.values)} |`,
		);

	return [
		table(["Property", "Category", "Applies to", "Inherits", "Units", "Known keywords"], rows),
		"",
		"Known keywords are completion hints, not a complete value grammar; use the property examples and value rules above for accepted numbers, colors, functions, and shorthands.",
	].join("\n");
}

function renderSystemVariables() {
	const rows = sortedEntries(SYSTEM_VARIABLE_REGISTRY_V1).map(
		([name, definition]) => `| ${code(name)} | ${markdown(definition.description)} |`,
	);
	return table(["Variable", "Runtime value"], rows);
}

function renderOwner(owner: TemplateSemanticManifest["parts"][number]["owner"]) {
	const details = [`owner: ${owner.kind}${owner.kind === "region" ? ` (${owner.key})` : ""}`];
	if ("placement" in owner && owner.placement) details.push(`placement: ${owner.placement}`);
	if ("origin" in owner && owner.origin) details.push(`origin: ${owner.origin}`);
	if ("sectionTypes" in owner && owner.sectionTypes) details.push(`section types: ${owner.sectionTypes.join(", ")}`);
	if ("columns" in owner && owner.columns) details.push(`columns: ${owner.columns}`);
	if ("position" in owner && owner.position === "last") details.push("last item only");
	return markdown(details.join("; "));
}

export function renderTemplateParts(manifests: Readonly<Record<string, TemplateSemanticManifest>>): string {
	const rows = Object.entries(manifests)
		.flatMap(([template, manifest]) =>
			manifest.parts.map((part) => {
				const selector =
					part.binding.type === "primitive"
						? `template-part[name="${part.name}"]`
						: `${part.binding.canonicalKind}[role~="${part.binding.token}"]`;
				let children = "canonical node";

				if (part.binding.type === "primitive") {
					if (!Object.hasOwn(TEMPLATE_PART_CHILD_KINDS_V1, part.name)) {
						throw new Error(`Missing template-part child coverage for ${template}:${part.name}.`);
					}
					children = list(TEMPLATE_PART_CHILD_KINDS_V1[part.name as keyof typeof TEMPLATE_PART_CHILD_KINDS_V1]);
				}

				return `| ${code(template)} | ${code(part.name)} | ${code(selector)} | ${renderOwner(part.owner)} | ${children} |`;
			}),
		)
		.sort();

	return table(["Template", "Name", "Selector", "Owner/condition", "Allowed children"], rows);
}

function renderDiagnostics() {
	const rows = [
		...sortedEntries(RRSS_DIAGNOSTIC_CATALOG_V1).map(
			([codeName, diagnostic]) =>
				`| ${code(codeName)} | ${diagnostic.severity} | ${markdown(diagnostic.meaning)} | ${markdown(diagnostic.action)} |`,
		),
		...sortedEntries(PDF_PREFLIGHT_DIAGNOSTIC_CATALOG).map(
			([codeName, diagnostic]) =>
				`| ${code(codeName)} | error | ${markdown(diagnostic.meaning)} | ${markdown(diagnostic.action)} |`,
		),
	].sort();

	return table(["Code", "Severity", "Meaning", "What to do"], rows);
}

function renderLimits() {
	const rows = [
		...sortedEntries(RRSS_LIMITS_V1).map(([name, value]) => `| Compiler | ${code(name)} | ${markdown(value)} |`),
		...sortedEntries(STYLESHEET_PREFLIGHT_LIMITS).map(
			([name, value]) => `| PDF preflight | ${code(name)} | ${markdown(value)} |`,
		),
	];
	return table(["Stage", "Limit", "Value"], rows);
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
		schema.maximum !== undefined && `maximum: ${schema.maximum}`,
		schema.minLength !== undefined && `minLength: ${schema.minLength}`,
		schema.maxLength !== undefined && `maxLength: ${schema.maxLength}`,
		schema.default !== undefined && `default: ${JSON.stringify(schema.default)}`,
	].filter((constraint): constraint is string => Boolean(constraint));
	return markdown(constraints.join("; ") || "—");
}

function renderSchemaReference(schema: JsonSchema) {
	const rows: string[] = [];
	const seen = new Set<string>();

	const visit = (node: JsonSchema, path: string, required: boolean | null) => {
		const type = schemaType(node);
		const key = `${path}\0${type}`;
		if (!seen.has(key)) {
			seen.add(key);
			rows.push(
				`| ${code(path)} | ${code(type)} | ${required === null ? "—" : required ? "yes" : "no"} | ${schemaConstraints(node)} | ${markdown(node.description ?? "—")} |`,
			);
		}

		const requiredProperties = new Set(node.required ?? []);
		for (const [name, property] of Object.entries(node.properties ?? {})) {
			visit(property, path ? `${path}.${name}` : name, requiredProperties.has(name));
		}
		if (node.items) visit(node.items, `${path}[]`, null);
		for (const branch of node.anyOf ?? node.oneOf ?? []) visit(branch, path, required);
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
		"`picture`, `basics`, `summary`, `sections`, `customSections`, and `metadata`",
		"",
		"## Field catalog",
		"",
		table(["Path", "Type", "Required", "Constraints and default", "Description"], rows),
		"",
	].join("\n");
}

export async function buildGeneratedDocumentation(paths: Partial<DocumentationPaths> = {}) {
	const resolvedPaths = { ...defaultPaths, ...paths };
	const [rrssSource, jsonSchemaSource] = await Promise.all([
		readFile(resolvedPaths.rrssReference, "utf8"),
		readFile(resolvedPaths.jsonSchemaGuide, "utf8"),
		readFile(resolvedPaths.skillSchemaReference, "utf8"),
	]);
	const schema = createResumeDataJsonSchema() as JsonSchema;
	const rrssBlocks = {
		"RRSS-SEMANTIC-ELEMENTS": renderSemanticElements(),
		"RRSS-PROPERTIES": renderProperties(),
		"RRSS-SYSTEM-VARIABLES": renderSystemVariables(),
		"RRSS-TEMPLATE-PARTS": renderTemplateParts(getTemplateSemanticRegistryFingerprintInput()),
		"RRSS-DIAGNOSTICS": renderDiagnostics(),
		"RRSS-LIMITS": renderLimits(),
	};
	let rrssReference = rrssSource;
	for (const [name, body] of Object.entries(rrssBlocks)) {
		rrssReference = replaceGeneratedBlock(rrssReference, name, body, resolvedPaths.rrssReference);
	}
	const fullSchemaBlock = ["```json /schema.json lines expandable", JSON.stringify(schema, null, "\t"), "```"].join(
		"\n",
	);

	return {
		rrssReference,
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
