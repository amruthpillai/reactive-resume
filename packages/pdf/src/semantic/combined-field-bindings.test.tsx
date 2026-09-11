import type { Style } from "@react-pdf/types";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import type { TemplateStyleSlots } from "../templates/shared/types";
import { describe, expect, it, vi } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { pdf } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { Document, Page } from "#react-pdf-renderer";
import { RenderProvider } from "../context";
import { ResumeDocument } from "../document";
import { TemplateProvider } from "../templates/shared/context";
import { Text } from "../templates/shared/primitives";
import { SemanticTextRuns } from "../templates/shared/sections";
import { createBindingInventory } from "./binding-inventory";
import { getTemplateSemanticBindingRegistry } from "./template-manifest";
import { buildSemanticTree } from "./tree";

type HostNode = {
	type: string;
	style?: unknown;
	value?: string;
	children?: HostNode[];
};

const nodeText = (node: HostNode): string =>
	node.value ?? (node.children ?? []).map((child) => nodeText(child)).join("");

const mergedStyle = (node: HostNode): Record<string, unknown> =>
	Object.assign({}, ...(Array.isArray(node.style) ? node.style : node.style ? [node.style] : []));

const findTexts = (node: HostNode, text: string): HostNode[] => [
	...(node.type === "TEXT" && nodeText(node) === text ? [node] : []),
	...(node.children ?? []).flatMap((child) => findTexts(child, text)),
];

const fixture = (mode: "legacy" | "semantic", section: "experience" | "education", rule = ""): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics.name = "Ada Lovelace";
	data.basics.email = "";
	data.sections.experience.items = [
		{
			id: "experience-1",
			hidden: false,
			company: "Analytical Engines",
			position: "Engineer",
			location: "London",
			period: "1842",
			website: { url: "", label: "", inlineLink: false },
			description: "",
			roles: [],
		},
	];
	data.sections.education.items = [
		{
			id: "education-1",
			hidden: false,
			school: "Cambridge",
			area: "Mathematics",
			degree: "BSc",
			grade: "First",
			location: "Cambridge",
			period: "1835",
			website: { url: "", label: "", inlineLink: false },
			description: "",
		},
	];
	data.metadata.layout.pages = [{ fullWidth: true, main: [section], sidebar: [] }];
	if (mode === "semantic") {
		const stylesheet = { languageVersion: 1, text: `@version 1; ${rule}` };
		data.metadata.stylesheet = { mode, source: stylesheet };
	}
	return data;
};

const renderHost = async (template: Template, data: ResumeData): Promise<HostNode> => {
	const element = createElement(ResumeDocument, { data, template }) as unknown as Parameters<typeof pdf>[0];
	const instance = pdf(element);
	await expect.poll(() => instance.container.document).not.toBeNull();
	return instance.container.document as HostNode;
};

const renderPdf = async (template: Template, data: ResumeData): Promise<Uint8Array> => {
	const renderer = await vi.importActual<typeof import("@react-pdf/renderer")>("@react-pdf/renderer");
	const element = createElement(ResumeDocument, { data, template }) as unknown as Parameters<
		typeof renderer.renderToBuffer
	>[0];
	return new Uint8Array(await renderer.renderToBuffer(element));
};

const rasterizeFirstPage = async (bytes: Uint8Array): Promise<Buffer> => {
	const document = await getDocument({ data: bytes }).promise;
	const page = await document.getPage(1);
	const viewport = page.getViewport({ scale: 1.5 });
	const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
	const context = canvas.getContext("2d");
	await page.render({
		canvas: canvas as unknown as HTMLCanvasElement,
		canvasContext: context as unknown as CanvasRenderingContext2D,
		viewport,
	}).promise;
	return canvas.toBuffer("image/png");
};

type CombinedFieldRun = {
	field: string;
	value: string;
	prefix?: string;
	suffix?: string;
};

type CombinedFieldRasterCase = {
	name: string;
	runs: readonly CombinedFieldRun[];
	separator: string;
	style?: Style;
};

const preSplitCombinedText = ({ runs, separator, style }: CombinedFieldRasterCase) => {
	const text = runs
		.filter(({ value }) => value.trim().length > 0)
		.map(({ value, prefix = "", suffix = "" }) => `${prefix}${value}${suffix}`)
		.join(separator);

	return (
		<Text bindSemanticNode={false} {...(style === undefined ? {} : { style })}>
			{text}
		</Text>
	);
};

const rasterFixtureStyles = {
	text: {
		fontFamily: "Helvetica",
		fontSize: 11,
		fontWeight: "400",
		lineHeight: 1.25,
		color: "#111111",
	},
} satisfies TemplateStyleSlots;

const CombinedFieldRasterDocument = ({
	testCase,
	preSplit,
}: {
	testCase: CombinedFieldRasterCase;
	preSplit: boolean;
}) => {
	const data = structuredClone(defaultResumeData);

	return (
		<Document>
			<Page size={{ width: 320, height: 96 }} style={{ padding: 18 }}>
				<RenderProvider data={data}>
					<TemplateProvider
						pageNodeKey="page-1"
						styles={rasterFixtureStyles}
						colors={{ foreground: "#111111", background: "#ffffff", primary: "#111111" }}
					>
						{preSplit ? (
							preSplitCombinedText(testCase)
						) : (
							<SemanticTextRuns
								host="education-degree-grade"
								runs={testCase.runs}
								separator={testCase.separator}
								style={testCase.style}
							/>
						)}
					</TemplateProvider>
				</RenderProvider>
			</Page>
		</Document>
	);
};

const renderCombinedFieldRaster = async (testCase: CombinedFieldRasterCase, preSplit: boolean): Promise<Buffer> => {
	const renderer = await vi.importActual<typeof import("@react-pdf/renderer")>("@react-pdf/renderer");
	const element = createElement(CombinedFieldRasterDocument, {
		testCase,
		preSplit,
	}) as unknown as Parameters<typeof renderer.renderToBuffer>[0];
	const bytes = new Uint8Array(await renderer.renderToBuffer(element));
	return rasterizeFirstPage(bytes);
};

const expectColor = (document: HostNode, text: string, color: string) => {
	expect(findTexts(document, text).some((node) => mergedStyle(node).color === color)).toBe(true);
};

describe("combined PDF field bindings", () => {
	it("binds each Onyx and Meowth combined Text identity once without widening field styles to its host", async () => {
		const semanticRule = `
			combined-text { color: #334455; font-size: 14pt; opacity: 0.6; margin-left: 3pt; }
			field[name="degree"] { opacity: 0.4; }
		`;
		const onyxData = fixture("semantic", "education", semanticRule);
		const meowthData = fixture("semantic", "education", semanticRule);
		const onyxTree = buildSemanticTree({
			data: onyxData,
			template: "onyx",
			page: onyxData.metadata.layout.pages[0] as NonNullable<(typeof onyxData.metadata.layout.pages)[number]>,
			pageNumber: 1,
			showHeader: true,
		});
		const meowthTree = buildSemanticTree({
			data: meowthData,
			template: "meowth",
			page: meowthData.metadata.layout.pages[0] as NonNullable<(typeof meowthData.metadata.layout.pages)[number]>,
			pageNumber: 1,
			showHeader: true,
		});
		const combinedNodes = (root: Parameters<typeof createBindingInventory>[0]) => {
			const matches: (typeof root)[] = [];
			const visit = (node: typeof root) => {
				if ((node.kind as string) === "combined-text") matches.push(node);
				for (const child of node.children) visit(child);
			};
			visit(root);
			return matches;
		};

		for (const [tree, template] of [
			[onyxTree, "onyx"],
			[meowthTree, "meowth"],
		] as const) {
			const inventory = createBindingInventory(tree, getTemplateSemanticBindingRegistry(template));
			const combined = combinedNodes(tree);
			expect(combined).not.toEqual([]);
			expect(
				combined.filter(({ key }) => inventory.bindings[key]?.type === "primitive").map(({ key }) => key),
			).toHaveLength(new Set(combined.map(({ key }) => key)).size - (template === "meowth" ? 1 : 0));
			const aliases = combined.flatMap(({ key }) => {
				const binding = inventory.bindings[key];
				return binding?.type === "alias" ? [{ key, binding }] : [];
			});
			if (template === "meowth") {
				expect(aliases).toHaveLength(1);
				expect(aliases[0]?.binding).toEqual({
					type: "alias",
					canonicalKind: "template-part",
					canonicalNodeKey: aliases[0]?.key.replace(/\/combined-text-education-grade-location$/, ""),
					token: "combined-text",
				});
			} else {
				expect(aliases).toEqual([]);
			}
			expect(inventory.syntheticWrapperCount).toBe(0);
		}

		for (const [template, data, text] of [
			["onyx", onyxData, "BSc • First"],
			["meowth", meowthData, "Mathematics (BSc)"],
		] as const) {
			const document = await renderHost(template, data);
			const outer = findTexts(document, text).map(mergedStyle);
			expect(outer).toContainEqual(
				expect.objectContaining({ color: "#334455", fontSize: 14, opacity: 0.6, marginLeft: 3 }),
			);
		}
	});

	it("splits all five combined variants into separately styleable existing Text runs", async () => {
		const colors = `
			field[name="position"] { color: #110000; }
			field[name="location"] { color: #220000; }
			field[name="area"] { color: #330000; }
			field[name="degree"] { color: #440000; }
			field[name="grade"] { color: #550000; }
			field[name="period"] { color: #660000; }
		`;
		const experience = await renderHost("meowth", fixture("semantic", "experience", colors));
		const inlineEducation = await renderHost("meowth", fixture("semantic", "education", colors));
		const splitEducation = await renderHost("onyx", fixture("semantic", "education", colors));

		expect(nodeText(experience)).toContain("Engineer (London)");
		expectColor(experience, "Engineer", "#110000");
		expectColor(experience, "(London)", "#220000");

		expect(nodeText(inlineEducation)).toContain("Mathematics (BSc)");
		expect(nodeText(inlineEducation)).toContain("First • Cambridge");
		expectColor(inlineEducation, "Mathematics", "#330000");
		expectColor(inlineEducation, "(BSc)", "#440000");
		expectColor(inlineEducation, "First", "#550000");
		expectColor(inlineEducation, "Cambridge", "#220000");

		expect(nodeText(splitEducation)).toContain("BSc • First");
		expect(nodeText(splitEducation)).toContain("Cambridge • 1835");
		expectColor(splitEducation, "BSc", "#440000");
		expectColor(splitEducation, "First", "#550000");
		expectColor(splitEducation, "Cambridge", "#220000");
		expectColor(splitEducation, "1835", "#660000");
	});

	it("uses the promoted single field's real semantic key", async () => {
		const experienceData = fixture(
			"semantic",
			"experience",
			'field[name="period"] { color: #660000; } field[name="location"] { color: #220000; }',
		);
		const experience = experienceData.sections.experience.items[0];
		if (!experience) throw new Error("Expected experience fixture.");
		experience.location = "";

		const educationData = fixture(
			"semantic",
			"education",
			'field[name="period"] { color: #660000; } field[name="degree"] { color: #440000; }',
		);
		const education = educationData.sections.education.items[0];
		if (!education) throw new Error("Expected education fixture.");
		education.degree = "";
		education.grade = "";
		education.location = "";

		expectColor(await renderHost("onyx", experienceData), "1842", "#660000");
		expectColor(await renderHost("onyx", educationData), "1835", "#660000");
	});

	it("keeps non-inheritable split-field styles on their final field hosts", async () => {
		const document = await renderHost(
			"meowth",
			fixture(
				"semantic",
				"experience",
				'field[name="position"] { opacity: 0.6; } field[name="location"] { margin-left: 3pt; }',
			),
		);
		const combined = findTexts(document, "Engineer (London)");
		const position = findTexts(document, "Engineer");
		const location = findTexts(document, "(London)");

		expect(combined.some((node) => mergedStyle(node).opacity === 0.6)).toBe(false);
		expect(combined.some((node) => mergedStyle(node).marginLeft === 3)).toBe(false);
		expect(position.map(mergedStyle)).toContainEqual(expect.objectContaining({ opacity: 0.6 }));
		expect(location.map(mergedStyle)).toContainEqual(expect.objectContaining({ marginLeft: 3 }));
	});

	it("publishes one existing Text binding for every split field key", () => {
		const data = fixture("semantic", "education");
		const tree = buildSemanticTree({
			data,
			template: "meowth",
			page: data.metadata.layout.pages[0] as NonNullable<(typeof data.metadata.layout.pages)[number]>,
			pageNumber: 1,
			showHeader: true,
		});
		const inventory = createBindingInventory(tree, getTemplateSemanticBindingRegistry("meowth"));
		const fieldBindings = Object.entries(inventory.bindings).filter(([key]) =>
			["area", "degree", "grade", "location", "period"].some((field) => key.endsWith(`/field-${field}`)),
		);

		expect(fieldBindings).toHaveLength(5);
		expect(fieldBindings.map(([, binding]) => binding)).toEqual(
			Array.from({ length: 5 }, () => ({ type: "primitive", primitive: "Text", source: "existing" })),
		);
	});

	it.each([
		["meowth", "experience"],
		["meowth", "education"],
		["onyx", "education"],
	] as const)(
		"keeps the real %s %s section raster-identical between legacy and empty semantic mode",
		async (template, section) => {
			const legacy = await rasterizeFirstPage(await renderPdf(template, fixture("legacy", section)));
			const semantic = await rasterizeFirstPage(await renderPdf(template, fixture("semantic", section)));

			expect(semantic.equals(legacy)).toBe(true);
		},
	);

	it.each([
		{
			name: "Meowth experience position and location",
			runs: [
				{ field: "position", value: "Engineer" },
				{ field: "location", value: "London", prefix: "(", suffix: ")" },
			],
			separator: " ",
		},
		{
			name: "Meowth education area and degree",
			runs: [
				{ field: "area", value: "Mathematics" },
				{ field: "degree", value: "BSc", prefix: "(", suffix: ")" },
			],
			separator: " ",
		},
		{
			name: "Meowth education grade and location",
			runs: [
				{ field: "grade", value: "First" },
				{ field: "location", value: "Cambridge" },
			],
			separator: " • ",
		},
		{
			name: "Onyx education degree and grade",
			runs: [
				{ field: "degree", value: "BSc" },
				{ field: "grade", value: "First" },
			],
			separator: " • ",
		},
		{
			name: "Onyx education location and period",
			runs: [
				{ field: "location", value: "Cambridge" },
				{ field: "period", value: "1835" },
			],
			separator: " • ",
			style: { textAlign: "right" },
		},
	] satisfies CombinedFieldRasterCase[])(
		"keeps the current split $name raster-identical to a test-only pre-split single Text",
		async (testCase) => {
			const preSplit = await renderCombinedFieldRaster(testCase, true);
			const split = await renderCombinedFieldRaster(testCase, false);

			expect(split.equals(preSplit)).toBe(true);
		},
	);
});
