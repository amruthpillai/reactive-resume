import type { SemanticNode } from "@reactive-resume/resume/stylesheet";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { ResolvedPdfNodePresentation } from "./adapter";
import type { ResolvedResumeRuntime } from "./resolve";
import {
	computeRenderDataHash,
	PROPERTY_REGISTRY_V1,
	projectPublicRenderData,
	SEMANTIC_REGISTRY_V1,
	SUPPORTED_SEMANTIC_CSS_VERSIONS,
	TEMPLATE_PART_CHILD_KINDS_V1,
} from "@reactive-resume/resume/stylesheet";
import { EMPTY_SEMANTIC_CSS_SOURCE } from "@reactive-resume/schema/resume/stylesheet";
import { resolveResumeRuntime, resolveStylesheetMode } from "./resolve";
import { getTemplateSemanticRegistryFingerprintInput } from "./template-manifest";

export const PUBLIC_STYLE_PROJECTION_FORMAT_VERSION = 1;
export const SEMANTIC_TREE_VERSION = 1;
const PDF_ADAPTER_VERSION = 1;
const REACT_PDF_RENDERER_VERSION = "4.5";

type PublicPdfStyleValue = string | number | null;
type PublicPdfPageSize = "A4" | "LETTER" | { width: number; height?: number };

export type PublicPdfNodePresentation = {
	style?: Readonly<Record<string, PublicPdfStyleValue>>;
	size?: PublicPdfPageSize;
	break?: boolean;
	wrap?: boolean;
	fixed?: boolean;
	minPresenceAhead?: number;
	orphans?: number;
	widows?: number;
	hidden?: boolean;
	order?: number;
};

export type PublicStyleProjection = {
	formatVersion: typeof PUBLIC_STYLE_PROJECTION_FORMAT_VERSION;
	languageVersion: number;
	semanticTreeVersion: typeof SEMANTIC_TREE_VERSION;
	registryFingerprint: string;
	adapterFingerprint: string;
	renderDataHash: string;
	nodes: Readonly<Record<string, PublicPdfNodePresentation>>;
};

type ProjectionFingerprints = Pick<
	PublicStyleProjection,
	"formatVersion" | "languageVersion" | "semanticTreeVersion" | "registryFingerprint" | "adapterFingerprint"
>;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
};

const hasExactKeys = (value: Record<string, unknown>, allowed: readonly string[]): boolean =>
	Object.keys(value).every((key) => allowed.includes(key)) && Object.getOwnPropertySymbols(value).length === 0;

const finiteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const isPageSize = (value: unknown): value is PublicPdfPageSize => {
	if (value === "A4" || value === "LETTER") return true;
	if (!isPlainObject(value) || !hasExactKeys(value, ["width", "height"]) || !finiteNumber(value.width)) return false;
	return value.height === undefined || finiteNumber(value.height);
};

const isPublicNode = (value: unknown): value is PublicPdfNodePresentation => {
	if (
		!isPlainObject(value) ||
		!hasExactKeys(value, [
			"style",
			"size",
			"break",
			"wrap",
			"fixed",
			"minPresenceAhead",
			"orphans",
			"widows",
			"hidden",
			"order",
		])
	) {
		return false;
	}
	if (value.style !== undefined) {
		if (!isPlainObject(value.style)) return false;
		for (const styleValue of Object.values(value.style)) {
			if (styleValue !== null && typeof styleValue !== "string" && !finiteNumber(styleValue)) {
				return false;
			}
		}
	}
	if (value.size !== undefined && !isPageSize(value.size)) return false;
	for (const key of ["break", "wrap", "fixed"] as const) {
		if (value[key] !== undefined && typeof value[key] !== "boolean") return false;
	}
	for (const key of ["minPresenceAhead", "orphans", "widows"] as const) {
		if (value[key] !== undefined && !finiteNumber(value[key])) return false;
	}
	if (value.hidden !== undefined && typeof value.hidden !== "boolean") return false;
	if (value.order !== undefined && (!Number.isInteger(value.order) || (value.order as number) < 0)) return false;
	return true;
};

const isProjectionShape = (value: unknown): value is PublicStyleProjection => {
	if (
		!isPlainObject(value) ||
		!hasExactKeys(value, [
			"formatVersion",
			"languageVersion",
			"semanticTreeVersion",
			"registryFingerprint",
			"adapterFingerprint",
			"renderDataHash",
			"nodes",
		]) ||
		!Number.isInteger(value.formatVersion) ||
		!Number.isInteger(value.languageVersion) ||
		!Number.isInteger(value.semanticTreeVersion) ||
		typeof value.registryFingerprint !== "string" ||
		typeof value.adapterFingerprint !== "string" ||
		typeof value.renderDataHash !== "string" ||
		!isPlainObject(value.nodes)
	) {
		return false;
	}

	return Object.values(value.nodes).every(isPublicNode);
};

type PublicNodeStructure = Pick<PublicPdfNodePresentation, "hidden" | "order">;

const toPublicNode = (
	presentation: ResolvedPdfNodePresentation,
	structure: PublicNodeStructure,
): PublicPdfNodePresentation => ({
	...(presentation.style
		? {
				style: Object.freeze(
					Object.fromEntries(
						Object.entries(presentation.style).map(([property, value]) => [
							property,
							value === undefined ? null : (value as string | number),
						]),
					),
				),
			}
		: {}),
	...(presentation.size === undefined ? {} : { size: presentation.size }),
	...(presentation.break === undefined ? {} : { break: presentation.break }),
	...(presentation.wrap === undefined ? {} : { wrap: presentation.wrap }),
	...(presentation.fixed === undefined ? {} : { fixed: presentation.fixed }),
	...(presentation.minPresenceAhead === undefined ? {} : { minPresenceAhead: presentation.minPresenceAhead }),
	...(presentation.orphans === undefined ? {} : { orphans: presentation.orphans }),
	...(presentation.widows === undefined ? {} : { widows: presentation.widows }),
	...(structure.hidden === undefined ? {} : { hidden: structure.hidden }),
	...(structure.order === undefined ? {} : { order: structure.order }),
});

const indexChildren = (tree: SemanticNode) => {
	const children = new Map<string, readonly string[]>();
	const visit = (node: SemanticNode) => {
		children.set(
			node.key,
			node.children.map(({ key }) => key),
		);
		for (const child of node.children) visit(child);
	};
	visit(tree);
	return children;
};

const projectNodeStructure = (
	sourceTree: SemanticNode,
	renderTree: SemanticNode,
): Readonly<Record<string, PublicNodeStructure>> => {
	const renderedChildren = indexChildren(renderTree);
	const structure: Record<string, PublicNodeStructure> = {};
	const visit = (node: SemanticNode) => {
		const rendered = renderedChildren.get(node.key) ?? [];
		const order = new Map(rendered.map((key, index) => [key, index]));
		for (const [sourceIndex, child] of node.children.entries()) {
			const renderedIndex = order.get(child.key);
			structure[child.key] =
				renderedIndex === undefined ? { hidden: true } : renderedIndex === sourceIndex ? {} : { order: renderedIndex };
			visit(child);
		}
	};
	visit(sourceTree);
	return structure;
};

const fingerprints = Promise.all([
	computeRenderDataHash({
		domainVersion: 1,
		data: {
			semanticTreeVersion: SEMANTIC_TREE_VERSION,
			semanticRegistry: SEMANTIC_REGISTRY_V1,
			templateParts: TEMPLATE_PART_CHILD_KINDS_V1,
			templateManifests: getTemplateSemanticRegistryFingerprintInput(),
		},
	}),
	computeRenderDataHash({
		domainVersion: 1,
		data: {
			adapterVersion: PDF_ADAPTER_VERSION,
			reactPdfRendererVersion: REACT_PDF_RENDERER_VERSION,
			propertyRegistry: PROPERTY_REGISTRY_V1,
		},
	}),
]);

const getFingerprints = async () => {
	const [registryFingerprint, adapterFingerprint] = await fingerprints;
	return { registryFingerprint, adapterFingerprint };
};

export const getPublicStyleProjectionFingerprints = getFingerprints;

const dataForPublicProjection = (data: ResumeData, languageVersion: number): ResumeData => {
	if (data.metadata.stylesheet?.mode === "semantic") return data;
	const source = { languageVersion, text: EMPTY_SEMANTIC_CSS_SOURCE };
	return {
		...data,
		metadata: {
			...data.metadata,
			stylesheet: { mode: "semantic", source, applied: source },
		},
	};
};

const projectionFingerprints = async (data: ResumeData, languageVersion?: number): Promise<ProjectionFingerprints> => ({
	formatVersion: PUBLIC_STYLE_PROJECTION_FORMAT_VERSION,
	languageVersion:
		languageVersion ??
		(data.metadata.stylesheet?.mode === "semantic" ? data.metadata.stylesheet.applied.languageVersion : 1),
	semanticTreeVersion: SEMANTIC_TREE_VERSION,
	...(await getFingerprints()),
});

const hashProjection = (
	data: ResumeData,
	nodes: PublicStyleProjection["nodes"],
	projection: ProjectionFingerprints,
): Promise<string> =>
	computeRenderDataHash({
		domainVersion: 1,
		data: projectPublicRenderData(data),
		resolvedNodes: nodes,
		projectionFingerprints: projection,
	});

export async function createPublicStyleProjection(input: { data: ResumeData }): Promise<PublicStyleProjection> {
	const runtime = resolveResumeRuntime({
		data: input.data,
		template: input.data.metadata.template,
		mode: resolveStylesheetMode(input.data),
	});
	if (runtime.diagnostics.some(({ severity }) => severity === "error")) {
		throw new Error("Applied semantic stylesheet cannot be projected");
	}

	const structure = projectNodeStructure(runtime.sourceTree, runtime.renderTree);
	const nodes = Object.freeze(
		Object.fromEntries(
			Object.entries(runtime.presentation).map(([nodeKey, presentation]) => [
				nodeKey,
				toPublicNode(presentation, structure[nodeKey] ?? {}),
			]),
		),
	);
	const projection = await projectionFingerprints(input.data);
	return Object.freeze({
		...projection,
		renderDataHash: await hashProjection(input.data, nodes, projection),
		nodes,
	});
}

export async function validatePublicStyleProjection(
	data: ResumeData,
	projection: PublicStyleProjection,
): Promise<boolean> {
	if (!isProjectionShape(projection)) return false;
	if (!SUPPORTED_SEMANTIC_CSS_VERSIONS.includes(projection.languageVersion as 1)) return false;
	if (
		data.metadata.stylesheet?.mode === "semantic" &&
		projection.languageVersion !== data.metadata.stylesheet.applied.languageVersion
	) {
		return false;
	}
	const projectionData = dataForPublicProjection(data, projection.languageVersion);
	const expected = await projectionFingerprints(projectionData, projection.languageVersion);
	if (
		projection.formatVersion !== expected.formatVersion ||
		projection.languageVersion !== expected.languageVersion ||
		projection.semanticTreeVersion !== expected.semanticTreeVersion ||
		projection.registryFingerprint !== expected.registryFingerprint ||
		projection.adapterFingerprint !== expected.adapterFingerprint
	) {
		return false;
	}

	try {
		return projection.renderDataHash === (await hashProjection(projectionData, projection.nodes, expected));
	} catch {
		return false;
	}
}

const toResolvedPresentation = (
	nodes: PublicStyleProjection["nodes"],
): Readonly<Record<string, ResolvedPdfNodePresentation>> =>
	Object.freeze(
		Object.fromEntries(
			Object.entries(nodes).map(([nodeKey, { hidden: _hidden, order: _order, style, ...presentation }]) => [
				nodeKey,
				{
					...presentation,
					...(style
						? {
								style: Object.fromEntries(
									Object.entries(style).map(([property, value]) => [property, value === null ? undefined : value]),
								) as NonNullable<ResolvedPdfNodePresentation["style"]>,
							}
						: {}),
				},
			]),
		),
	);

const applyProjectedStructure = (node: SemanticNode, nodes: PublicStyleProjection["nodes"]): SemanticNode => ({
	...node,
	attributes: { ...node.attributes },
	roles: [...node.roles],
	children: node.children
		.map((child, sourceIndex) => ({ child, sourceIndex, structure: nodes[child.key] }))
		.filter(({ structure }) => !structure?.hidden)
		.sort(
			(left, right) =>
				(left.structure?.order ?? left.sourceIndex) - (right.structure?.order ?? right.sourceIndex) ||
				left.sourceIndex - right.sourceIndex,
		)
		.map(({ child }) => applyProjectedStructure(child, nodes)),
});

export async function resolvePublicStyleProjectionRuntime(
	data: ResumeData,
	projection: PublicStyleProjection,
): Promise<ResolvedResumeRuntime> {
	if (!(await validatePublicStyleProjection(data, projection))) {
		throw new Error("Public style projection does not match the resume render data");
	}
	const projectionData = dataForPublicProjection(data, projection.languageVersion);
	const base = resolveResumeRuntime({
		data: projectionData,
		template: projectionData.metadata.template,
		mode: "legacy",
	});
	return {
		presentation: toResolvedPresentation(projection.nodes),
		sourceTree: base.sourceTree,
		renderTree: applyProjectedStructure(base.sourceTree, projection.nodes),
		diagnostics: [],
	};
}
