import type {
	BaseSettingsSnapshot,
	ResolvedNodeStyle,
	ResolveStylesheetContext,
	SemanticNode,
} from "@reactive-resume/resume/stylesheet";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { compileStylesheet, PROPERTY_REGISTRY_V1, resolveStylesheet } from "@reactive-resume/resume/stylesheet";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { Document, Image, Page, renderToBuffer, Text, View } from "#react-pdf-renderer";
import { adaptResolvedPdfNode, resolvedPdfFlowProps, resolvedPdfTextProps } from "./adapter";

const pictureFixture =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const borderShorthands = ["border", "border-top", "border-right", "border-bottom", "border-left"] as const;
const borderShorthandHints = [
	"inherit",
	"initial",
	"revert",
	"unset",
	"1pt dotted",
	"1pt dashed",
	"1pt solid",
] as const;
const blankStyle: ResolvedNodeStyle = { style: {}, structural: {}, hidden: false, order: 0 };
const baseSettings: BaseSettingsSnapshot = {
	picture: defaultResumeData.picture,
	template: defaultResumeData.metadata.template,
	design: defaultResumeData.metadata.design,
	typography: defaultResumeData.metadata.typography,
	page: defaultResumeData.metadata.page,
	layout: { sidebarWidth: defaultResumeData.metadata.layout.sidebarWidth },
};
const context: ResolveStylesheetContext = {
	baseStyles: {},
	baseSettings,
	pages: [{ pageKey: "page", width: 595.28, height: 841.89 }],
};
const fixedValueHints = Object.entries(PROPERTY_REGISTRY_V1).flatMap(([property, definition]) => {
	const kind = definition?.appliesTo[0];
	return kind ? definition.values.map((value) => ({ property, kind, value })) : [];
});

const node = (kind: SemanticNode["kind"]): SemanticNode => ({
	key: kind,
	kind,
	attributes: {},
	roles: [],
	children: [],
});

async function renderFixedValueHint(property: string, kind: SemanticNode["kind"], value: string) {
	const compiled = compileStylesheet({
		languageVersion: 1,
		text: `@version 1; ${kind} { ${property}: ${value}; }`,
	});
	expect(
		compiled.diagnostics.filter(({ severity }) => severity === "error"),
		`${property}: ${value} failed compilation`,
	).toEqual([]);
	expect(compiled.program, `${property}: ${value} did not compile`).not.toBeNull();
	if (!compiled.program) return;

	const resolved = resolveStylesheet(compiled.program, node(kind), context);
	expect(
		resolved.diagnostics.filter(({ severity }) => severity === "error"),
		`${property}: ${value} failed cascade resolution`,
	).toEqual([]);
	const presentation = adaptResolvedPdfNode(resolved.nodes[kind] ?? blankStyle);
	const style = presentation.style === undefined ? {} : { style: presentation.style };
	const content =
		kind === "picture"
			? createElement(Image, {
					src: pictureFixture,
					...style,
					...resolvedPdfFlowProps(presentation),
				})
			: definitionIsText(property)
				? createElement(Text, { ...style, ...resolvedPdfTextProps(presentation) }, "Value hint")
				: createElement(
						View,
						{ ...style, ...resolvedPdfFlowProps(presentation) },
						createElement(Text, null, "Value hint"),
					);
	const document = createElement(
		Document,
		null,
		createElement(Page, { size: presentation.size ?? "A4" }, content),
	) as unknown as Parameters<typeof renderToBuffer>[0];

	await expect(renderToBuffer(document), `${property}: ${value} failed React PDF rendering`).resolves.toBeDefined();
}

const definitionIsText = (property: string) =>
	PROPERTY_REGISTRY_V1[property]?.category === "text" || property === "color";

describe("adaptResolvedPdfNode", () => {
	it("renders every published fixed value hint through cascade and the React PDF adapter", async () => {
		for (const property of borderShorthands) {
			expect(fixedValueHints.filter((hint) => hint.property === property).map(({ value }) => value)).toEqual(
				borderShorthandHints,
			);
		}

		for (const { property, kind, value } of fixedValueHints) {
			await renderFixedValueHint(property, kind, value);
		}
	}, 30_000);

	it("maps resolved CSS names and structural values to the owning React PDF primitive props", () => {
		const resolved = {
			style: {
				"background-color": "#1e293b",
				"font-size": 9,
				"font-weight": "400",
				"text-decoration": "none",
			},
			structural: {
				breakBefore: "page",
				breakInside: "avoid",
				fixed: true,
				minPresenceAhead: 24,
				orphans: 2,
				widows: 3,
				pageSize: "A4",
			},
			hidden: false,
			order: 0,
		} satisfies ResolvedNodeStyle;

		expect(adaptResolvedPdfNode(resolved)).toEqual({
			style: {
				backgroundColor: "#1e293b",
				fontSize: 9,
				fontWeight: "400",
				textDecoration: "none",
			},
			break: true,
			wrap: false,
			fixed: true,
			minPresenceAhead: 24,
			orphans: 2,
			widows: 3,
			size: "A4",
		});
	});

	it("preserves explicit values equal to the resolver base and distinguishes initial from host-base resets", () => {
		const base = {
			style: { color: "#111111", "font-weight": "700" },
			structural: {},
			hidden: false,
			order: 0,
		} satisfies ResolvedNodeStyle;
		const resolved = {
			...base,
			style: { color: "#111111" },
			specifiedStyleProperties: ["color", "font-weight"],
			hostBaseStyleProperties: ["color"],
		} satisfies ResolvedNodeStyle;

		expect(adaptResolvedPdfNode(resolved, base)).toEqual({
			style: {
				fontWeight: undefined,
			},
		});
	});

	it("does not materialize inherited resolver base values onto a host that already inherits from the renderer tree", () => {
		const base = {
			style: {},
			structural: {},
			hidden: false,
			order: 0,
		} satisfies ResolvedNodeStyle;
		const resolved = {
			...base,
			style: { color: "#111111", "font-size": 10 },
			specifiedStyleProperties: [],
			hostBaseStyleProperties: [],
		} satisfies ResolvedNodeStyle;

		expect(adaptResolvedPdfNode(resolved, base)).toEqual({});
	});

	it("emits explicit flow cancellations when semantic structure clears builder pagination", () => {
		const base = {
			style: {},
			structural: { breakBefore: "page", breakInside: "avoid" },
			hidden: false,
			order: 0,
		} satisfies ResolvedNodeStyle;
		const resolved = {
			...base,
			structural: {},
		} satisfies ResolvedNodeStyle;

		expect(adaptResolvedPdfNode(resolved, base)).toEqual({
			break: false,
			wrap: true,
		});
		expect(adaptResolvedPdfNode(base, base)).toEqual({
			break: true,
			wrap: false,
		});
	});
});
