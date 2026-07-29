import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { StylesheetSource } from "@reactive-resume/schema/resume/stylesheet";
import type { Template } from "@reactive-resume/schema/templates";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { PROPERTY_REGISTRY_V1 } from "@reactive-resume/resume/stylesheet";
import { styleRulesSchema } from "@reactive-resume/schema/resume/data";
import { ResumeDocument } from "../document";

export type CompareLegacySemanticPresentationInput = {
	data: ResumeData;
	convertedSource: StylesheetSource;
	templates: readonly Template[];
};

export type LegacySemanticPresentationComparison = {
	pageCountMismatches: readonly string[];
	primitivePropMismatches: readonly string[];
	mismatches: readonly string[];
};

export type LegacyParityHostNode = {
	type: string;
	props?: Readonly<Record<string, unknown>>;
	style?: unknown;
	value?: string;
	children?: readonly LegacyParityHostNode[];
};

type PrimitiveSnapshot = {
	type: string;
	text: string;
	props: Readonly<Record<string, unknown>>;
	style: Readonly<Record<string, unknown>>;
	children: readonly PrimitiveSnapshot[];
};

const primitiveTypes = new Set(["PAGE", "VIEW", "TEXT", "LINK", "IMAGE", "SVG"]);
const inheritableProperties = new Set(
	Object.entries(PROPERTY_REGISTRY_V1)
		.filter(([, definition]) => definition?.inheritable)
		.map(([property]) => property.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase())),
);
const textPrimitiveTypes = new Set(["TEXT", "LINK"]);
const textOnlyInheritedProperties = new Set([
	"fontFamily",
	"fontSize",
	"fontStyle",
	"fontWeight",
	"letterSpacing",
	"lineHeight",
	"textAlign",
	"textIndent",
	"textTransform",
]);
const rendererDefaults: Readonly<Record<string, unknown>> = { fontWeight: 400 };

const nodeText = (node: LegacyParityHostNode): string =>
	node.value ?? (node.children ?? []).map((child) => nodeText(child)).join("");

const normalizeValue = (value: unknown): unknown => {
	if (value === undefined) return "[undefined]";
	if (typeof value === "function") return `[function:${value.name || "anonymous"}]`;
	if (Array.isArray(value)) return value.map(normalizeValue);
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>)
				.filter(([, entry]) => entry !== undefined)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, entry]) => [key, normalizeValue(entry)]),
		);
	}
	return value;
};

const normalizeHexColor = (value: string): string | undefined => {
	const match = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.exec(value);
	if (!match) return;
	const digits = match[1]?.toLowerCase();
	if (!digits) return;
	return digits.length <= 4 ? `#${[...digits].map((digit) => `${digit}${digit}`).join("")}` : `#${digits}`;
};

const normalizeRgbColor = (value: string): string | undefined => {
	const match =
		/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d*\.?\d+)\s*)?\)$/i.exec(value);
	if (!match) return;
	const channels = match.slice(1, 4).map(Number);
	if (channels.some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 255)) return;
	const alpha = match[4] === undefined ? 1 : Number(match[4]);
	if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) return;
	const hex = channels.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("");
	const alphaHex = Math.round(alpha * 255)
		.toString(16)
		.padStart(2, "0");
	return `#${hex}${alphaHex === "ff" ? "" : alphaHex}`;
};

const normalizeColor = (value: string): string => {
	const normalized = value.trim().toLowerCase();
	if (normalized === "transparent") return "#00000000";
	return normalizeHexColor(normalized) ?? normalizeRgbColor(normalized) ?? normalized;
};

const normalizeStyleValue = (property: string, value: unknown): unknown => {
	if (typeof value === "string" && (property === "color" || property.endsWith("Color"))) {
		return normalizeColor(value);
	}
	if (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value)) return Number.parseFloat(value);
	return normalizeValue(value);
};

const mergedStyle = (style: unknown): Readonly<Record<string, unknown>> => {
	const entries = Array.isArray(style) ? style : style ? [style] : [];
	const merged = Object.assign({}, ...entries) as Record<string, unknown>;
	if (merged.borderWidth !== undefined) {
		for (const side of ["Top", "Right", "Bottom", "Left"]) {
			const property = `border${side}Width`;
			if (merged[property] === undefined) merged[property] = merged.borderWidth;
		}
		delete merged.borderWidth;
	}
	if (merged.borderRadius !== undefined) {
		for (const corner of ["TopLeft", "TopRight", "BottomRight", "BottomLeft"]) {
			const property = `border${corner}Radius`;
			if (merged[property] === undefined) merged[property] = merged.borderRadius;
		}
		delete merged.borderRadius;
	}
	return Object.fromEntries(
		Object.entries(merged)
			.filter(([, value]) => value !== undefined)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([property, value]) => [property, normalizeStyleValue(property, value)]),
	);
};

const collectPrimitiveSnapshots = (
	node: LegacyParityHostNode,
	inheritedStyle: Readonly<Record<string, unknown>> = rendererDefaults,
): PrimitiveSnapshot[] => {
	const localStyle = mergedStyle(node.style);
	const computedStyle: Record<string, unknown> = { ...localStyle };
	for (const property of inheritableProperties) {
		if (!(property in computedStyle) && property in inheritedStyle) computedStyle[property] = inheritedStyle[property];
	}
	const nextInherited = Object.fromEntries(
		[...inheritableProperties].flatMap((property) =>
			property in computedStyle ? [[property, computedStyle[property]]] : [],
		),
	);
	const children = (node.children ?? []).flatMap((child) => collectPrimitiveSnapshots(child, nextInherited));
	if (!primitiveTypes.has(node.type)) return children;
	const isSplitFieldTextWrapper =
		node.type === "TEXT" &&
		(node.children ?? []).some((child) => child.type === "TEXT") &&
		(node.children ?? []).every((child) => child.type === "TEXT" || child.type === "TEXT_INSTANCE");
	const snapshotStyle = Object.fromEntries(
		Object.entries(computedStyle).filter(
			([property]) =>
				(!isSplitFieldTextWrapper || !inheritableProperties.has(property)) &&
				(textPrimitiveTypes.has(node.type) || !textOnlyInheritedProperties.has(property)),
		),
	);
	const props = Object.fromEntries(
		Object.entries(node.props ?? {}).filter(([property]) => property !== "children" && property !== "style"),
	);
	return [
		{
			type: node.type,
			text: nodeText(node),
			props: normalizeValue(props) as Readonly<Record<string, unknown>>,
			style: snapshotStyle,
			children,
		},
	];
};

const waitForDocument = async (instance: ReturnType<typeof pdf>): Promise<LegacyParityHostNode> => {
	const deadline = Date.now() + 5_000;
	while (!instance.container.document) {
		if (Date.now() >= deadline) throw new Error("Timed out while rendering legacy parity document.");
		await new Promise((resolve) => setTimeout(resolve, 0));
	}
	return instance.container.document as LegacyParityHostNode;
};

const renderSnapshots = async (data: ResumeData, template: Template): Promise<PrimitiveSnapshot[]> => {
	const element = createElement(ResumeDocument, { data, template }) as unknown as Parameters<typeof pdf>[0];
	return collectPrimitiveSnapshots(await waitForDocument(pdf(element)));
};

const arrayEntryLabel = (value: unknown): string => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return "";
	const entry = value as { type?: unknown; text?: unknown };
	if (typeof entry.type !== "string") return "";
	const text = typeof entry.text === "string" ? entry.text.replace(/\s+/g, " ").trim().slice(0, 32) : "";
	return `<${entry.type}${text ? `:${JSON.stringify(text)}` : ""}>`;
};

const diffValues = (legacy: unknown, semantic: unknown, path: string, mismatches: string[]): void => {
	if (Object.is(legacy, semantic)) return;
	if (Array.isArray(legacy) && Array.isArray(semantic)) {
		if (legacy.length !== semantic.length) {
			mismatches.push(`${path}.length: legacy=${legacy.length} semantic=${semantic.length}`);
		}
		for (let index = 0; index < Math.max(legacy.length, semantic.length); index++) {
			const label = arrayEntryLabel(legacy[index] ?? semantic[index]);
			diffValues(legacy[index], semantic[index], `${path}[${index}]${label}`, mismatches);
		}
		return;
	}
	if (
		legacy &&
		semantic &&
		typeof legacy === "object" &&
		typeof semantic === "object" &&
		!Array.isArray(legacy) &&
		!Array.isArray(semantic)
	) {
		const keys = new Set([
			...Object.keys(legacy as Record<string, unknown>),
			...Object.keys(semantic as Record<string, unknown>),
		]);
		for (const key of [...keys].sort()) {
			diffValues(
				(legacy as Record<string, unknown>)[key],
				(semantic as Record<string, unknown>)[key],
				`${path}.${key}`,
				mismatches,
			);
		}
		return;
	}
	mismatches.push(`${path}: legacy=${JSON.stringify(legacy)} semantic=${JSON.stringify(semantic)}`);
};

export function compareLegacyParityHostNodes(
	legacy: LegacyParityHostNode,
	semantic: LegacyParityHostNode,
): readonly string[] {
	const mismatches: string[] = [];
	diffValues(collectPrimitiveSnapshots(legacy), collectPrimitiveSnapshots(semantic), "root", mismatches);
	return mismatches;
}

export async function compareLegacySemanticPresentation(
	input: CompareLegacySemanticPresentationInput,
): Promise<LegacySemanticPresentationComparison> {
	const sanitizedRules = styleRulesSchema.parse(input.data.metadata.styleRules ?? []);
	const { stylesheet: _stylesheet, ...metadata } = input.data.metadata;
	const legacyData: ResumeData = {
		...input.data,
		metadata: { ...metadata, styleRules: sanitizedRules },
	};
	const semanticData: ResumeData = {
		...input.data,
		metadata: {
			...input.data.metadata,
			styleRules: sanitizedRules,
			stylesheet: {
				mode: "semantic",
				source: input.convertedSource,
				applied: input.convertedSource,
			},
		},
	};
	const pageCountMismatches: string[] = [];
	const primitivePropMismatches: string[] = [];

	for (const template of input.templates) {
		const legacy = await renderSnapshots(legacyData, template);
		const semantic = await renderSnapshots(semanticData, template);
		const legacyPages = legacy.filter(({ type }) => type === "PAGE").length;
		const semanticPages = semantic.filter(({ type }) => type === "PAGE").length;
		if (legacyPages !== semanticPages) {
			pageCountMismatches.push(`${template}: legacy=${legacyPages} semantic=${semanticPages}`);
		}
		diffValues(legacy, semantic, template, primitivePropMismatches);
	}

	return {
		pageCountMismatches,
		primitivePropMismatches,
		mismatches: [...pageCountMismatches, ...primitivePropMismatches],
	};
}
