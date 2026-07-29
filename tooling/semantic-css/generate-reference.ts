import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
	PROPERTY_REGISTRY_V1,
	SEMANTIC_NODE_KINDS,
	SEMANTIC_REGISTRY_V1,
	SYSTEM_VARIABLE_REGISTRY_V1,
	TEMPLATE_PART_CHILD_KINDS_V1,
} from "@reactive-resume/resume/stylesheet/registry";

const START = "<!-- RRSS-GENERATED:START -->";
const END = "<!-- RRSS-GENERATED:END -->";
const cell = (values: readonly string[]) => (values.length ? values.map((value) => `\`${value}\``).join(", ") : "—");

function renderSemanticCssReference() {
	const semanticRows = SEMANTIC_NODE_KINDS.map((kind) => {
		const definition = SEMANTIC_REGISTRY_V1[kind];
		return `| \`${kind}\` | ${cell(definition.attributes)} | ${cell(definition.roles)} |`;
	});
	const propertyRows = Object.entries(PROPERTY_REGISTRY_V1)
		.filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => entry[1] !== undefined)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(
			([name, definition]) =>
				`| \`${name}\` | ${definition.category} | ${definition.inheritable ? "yes" : "no"} | ${cell(definition.units)} | ${cell(definition.values)} |`,
		);
	const variableRows = Object.entries(SYSTEM_VARIABLE_REGISTRY_V1).map(
		([name, definition]) => `| \`${name}\` | ${definition.description} |`,
	);
	const partRows = Object.entries(TEMPLATE_PART_CHILD_KINDS_V1).map(
		([name, childKinds]) => `| \`${name}\` | ${cell(childKinds)} |`,
	);

	return [
		"### Semantic elements",
		"",
		"| Element | Attributes | Roles |",
		"| --- | --- | --- |",
		...semanticRows,
		"",
		"All semantic elements also accept `id` and `role` selectors when those values exist on the node.",
		"",
		"### Properties",
		"",
		"| Property | Category | Inherits | Units | Keywords |",
		"| --- | --- | --- | --- | --- |",
		...propertyRows,
		"",
		"### Read-only system variables",
		"",
		"| Variable | Value |",
		"| --- | --- |",
		...variableRows,
		"",
		"Names beginning with `--rr-` are reserved and cannot be reassigned. Define author variables with another prefix.",
		"",
		"### Template-part names",
		"",
		"| Part | Allowed semantic children |",
		"| --- | --- |",
		...partRows,
		"",
		"A part is selectable only when the current template manifest exposes it.",
	].join("\n");
}

export async function updateSemanticCssReference(path: string) {
	const source = await readFile(path, "utf8");
	const start = source.indexOf(START);
	const end = source.indexOf(END);
	if (start < 0 || end < start) throw new Error(`Missing ${START}/${END} markers in ${path}.`);
	const generated = `${START}\n${renderSemanticCssReference()}\n${END}`;
	const output = `${source.slice(0, start)}${generated}${source.slice(end + END.length)}`;
	await writeFile(path, output);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	const target =
		process.argv[2] ?? fileURLToPath(new URL("../../docs/guides/semantic-css-reference.mdx", import.meta.url));
	await updateSemanticCssReference(target);
}
