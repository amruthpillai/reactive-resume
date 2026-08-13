import type { ResumeData, StyleRule } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import type { LegacyParityHostNode } from "./legacy-parity";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { styleRulesSchema } from "@reactive-resume/schema/resume/data";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { ResumeDocument } from "../document";
import { convertLegacyStyleRules } from "./legacy-converter";
import { compareLegacyParityHostNodes, compareLegacySemanticPresentation } from "./legacy-parity";

const fixtureNames = [
	"all-templates-smoke",
	"array-order-tie",
	"award-unbold",
	"clamped-spacing",
	"combined-text-host",
	"custom-section-type",
	"disabled-rules",
	"icon-level-size",
	"link-underline-3134",
	"merge-specificity",
	"primary-text-bold-3146",
	"rich-text-all-slots",
	"sanitized-intent-3199",
	"section-id-uuid",
] as const;

const templates = [
	"azurill",
	"bronzor",
	"chikorita",
	"ditgar",
	"ditto",
	"gengar",
	"glalie",
	"kakuna",
	"lapras",
	"leafish",
	"meowth",
	"onyx",
	"pikachu",
	"rhyhorn",
	"scizor",
] as const satisfies readonly Template[];

const readRules = (name: string): StyleRule[] =>
	styleRulesSchema.parse(
		JSON.parse(readFileSync(new URL(`./__fixtures__/legacy/${name}.json`, import.meta.url), "utf8")),
	);

const buildFixture = (rules: StyleRule[]): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics = {
		name: "Ada Lovelace",
		headline: "Engineer",
		email: "ada@example.com",
		phone: "",
		location: "London",
		website: { url: "", label: "" },
		customFields: [],
	};
	data.summary.hidden = false;
	data.summary.content =
		'<p>Paragraph <strong>bold</strong> <mark>mark</mark> <a href="https://example.com">link</a></p><ul><li>List item</li></ul>';
	data.sections.experience.items = [
		{
			id: "experience-1",
			hidden: false,
			company: "Analytical Engines",
			position: "Engineer",
			location: "London",
			period: "1842",
			website: { url: "https://example.com/work", label: "Work", inlineLink: true },
			description: "<p>Built engines.</p>",
			roles: [
				{
					id: "role-1",
					position: "Senior Engineer",
					period: "1843",
					description: "<p>Led the engine team.</p>",
				},
			],
		},
	];
	data.sections.education.items = [
		{
			id: "education-1",
			hidden: false,
			school: "University of London",
			degree: "BSc",
			area: "Mathematics",
			grade: "First",
			location: "London",
			period: "1835",
			website: { url: "", label: "", inlineLink: false },
			description: "<p>Studied analytical engines.</p>",
		},
	];
	data.sections.skills.items = [
		{
			id: "skill-1",
			hidden: false,
			icon: "code",
			iconColor: "",
			name: "Mathematics",
			proficiency: "Expert",
			level: 3,
			keywords: ["Analysis"],
		},
	];
	data.sections.awards.items = [
		{
			id: "award-1",
			hidden: false,
			title: "Prize",
			awarder: "Society",
			date: "1843",
			website: { url: "", label: "", inlineLink: false },
			description: "<p>First programmer.</p>",
		},
	];
	data.customSections = [
		{
			id: "1d7312cb-9ba2-4d42-9ca8-2a9ca05f9f37",
			type: "experience",
			title: "Consulting",
			icon: "briefcase",
			columns: 1,
			hidden: false,
			keepTogether: false,
			startOnNewPage: false,
			items: [
				{
					id: "custom-experience-1",
					hidden: false,
					company: "Difference Engines",
					position: "Consultant",
					location: "London",
					period: "1844",
					website: { url: "", label: "", inlineLink: false },
					description: "<p>Advised builders.</p>",
					roles: [],
				},
			],
		},
	];
	data.metadata.layout.pages = [
		{
			fullWidth: true,
			main: ["summary", "experience", "education", "skills", "awards", "1d7312cb-9ba2-4d42-9ca8-2a9ca05f9f37"],
			sidebar: [],
		},
	];
	data.metadata.styleRules = rules;
	return data;
};

const nodeText = (node: LegacyParityHostNode): string =>
	node.value ?? (node.children ?? []).map((child) => nodeText(child)).join("");

const renderHostDocument = async (data: ResumeData): Promise<LegacyParityHostNode> => {
	const element = createElement(ResumeDocument, { data, template: "gengar" }) as unknown as Parameters<typeof pdf>[0];
	const instance = pdf(element);
	await expect.poll(() => instance.container.document).not.toBeNull();
	return instance.container.document as LegacyParityHostNode;
};

const findEmptyTextNodes = (node: LegacyParityHostNode): LegacyParityHostNode[] => [
	...(node.type === "TEXT" && nodeText(node) === "" ? [node] : []),
	...(node.children ?? []).flatMap(findEmptyTextNodes),
];

const hasFontSize = (node: LegacyParityHostNode, fontSize: number): boolean =>
	(Array.isArray(node.style) ? node.style : [node.style]).some(
		(style) =>
			style !== null && typeof style === "object" && (style as Readonly<Record<string, unknown>>).fontSize === fontSize,
	);

describe("compareLegacySemanticPresentation", () => {
	it("renders the mandatory target shapes in the shared parity document", () => {
		const data = buildFixture([]);

		expect(data.sections.experience.items[0]?.roles[0]?.position).toBe("Senior Engineer");
		expect(data.customSections).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "1d7312cb-9ba2-4d42-9ca8-2a9ca05f9f37",
					type: "experience",
				}),
			]),
		);
		expect(data.metadata.layout.pages[0]?.main).toContain("1d7312cb-9ba2-4d42-9ca8-2a9ca05f9f37");
	});

	it.each(fixtureNames)("matches final primitive props for %s", async (fixture) => {
		const data = buildFixture(readRules(fixture));
		const conversion = convertLegacyStyleRules(data);
		const comparison = await compareLegacySemanticPresentation({
			data,
			convertedSource: conversion.source,
			templates: ["onyx"],
		});

		expect(comparison.pageCountMismatches).toEqual([]);
		expect(comparison.primitivePropMismatches).toEqual([]);
		expect(comparison.mismatches).toEqual([]);
	});

	it("matches final primitive props on every template", async () => {
		const data = buildFixture(readRules("all-templates-smoke"));
		const conversion = convertLegacyStyleRules(data);
		const comparison = await compareLegacySemanticPresentation({
			data,
			convertedSource: conversion.source,
			templates,
		});

		expect(comparison.pageCountMismatches).toEqual([]);
		expect(comparison.primitivePropMismatches).toEqual([]);
		expect(comparison.mismatches).toEqual([]);
	}, 30_000);

	it("matches the real sample on every template for a substantive custom-section rule", async () => {
		const data = structuredClone(sampleResumeData);
		data.metadata.styleRules = readRules("custom-section-type");
		const conversion = convertLegacyStyleRules(data);
		const comparison = await compareLegacySemanticPresentation({
			data,
			convertedSource: conversion.source,
			templates,
		});

		expect(comparison.pageCountMismatches).toEqual([]);
		expect(comparison.primitivePropMismatches).toEqual([]);
		expect(comparison.mismatches).toEqual([]);
	}, 30_000);

	it("preserves Scizor template-after Bold color for converted legacy text rules", async () => {
		const data = buildFixture(readRules("primary-text-bold-3146"));
		data.metadata.template = "scizor";
		const conversion = convertLegacyStyleRules(data);
		const comparison = await compareLegacySemanticPresentation({
			data,
			convertedSource: conversion.source,
			templates: ["scizor"],
		});

		expect(comparison.pageCountMismatches).toEqual([]);
		expect(comparison.primitivePropMismatches).toEqual([]);
		expect(comparison.mismatches).toEqual([]);
	});

	it("omits empty Gengar skill proficiency text while preserving populated text", async () => {
		const data = buildFixture([]);
		data.metadata.template = "gengar";
		data.metadata.layout.pages = [{ fullWidth: false, main: [], sidebar: ["skills"] }];
		data.metadata.typography.body.fontSize = 9;
		const [skill] = data.sections.skills.items;
		if (!skill) throw new Error("Expected Gengar skill fixture.");
		skill.proficiency = "";
		expect(findEmptyTextNodes(await renderHostDocument(data)).filter((node) => hasFontSize(node, 9))).toEqual([]);

		skill.proficiency = "Expert";
		expect(nodeText(await renderHostDocument(data))).toContain("Expert");
	});

	it.each(["onyx", "meowth"] as const)(
		"matches combined separator and box-style primitives on %s",
		async (template) => {
			const data = buildFixture(readRules("combined-text-host"));
			const conversion = convertLegacyStyleRules(data);
			const comparison = await compareLegacySemanticPresentation({
				data,
				convertedSource: conversion.source,
				templates: [template],
			});

			expect(comparison.mismatches).toEqual([]);
		},
	);

	it.each([
		["text", { type: "TEXT", value: "legacy" }, { type: "TEXT", value: "semantic" }],
		[
			"props",
			{ type: "LINK", props: { src: "https://legacy.example" } },
			{ type: "LINK", props: { src: "https://semantic.example" } },
		],
		["alpha", { type: "TEXT", style: { color: "#11223380" } }, { type: "TEXT", style: { color: "#112233" } }],
		["transparent", { type: "TEXT", style: { color: "transparent" } }, { type: "TEXT", style: { color: "black" } }],
		["unsupported color", { type: "TEXT", style: { color: "brand-ink" } }, { type: "TEXT", style: { color: "black" } }],
		["units", { type: "TEXT", style: { fontSize: "12pt" } }, { type: "TEXT", style: { fontSize: "12px" } }],
		["hierarchy", { type: "VIEW", children: [{ type: "TEXT", value: "same" }] }, { type: "TEXT", value: "same" }],
		["geometry", { type: "VIEW", style: { width: 10 } }, { type: "VIEW", style: { width: 11 } }],
		[
			"split wrapper inherited style",
			{
				type: "TEXT",
				style: { color: "#112233" },
				children: [{ type: "TEXT", style: { color: "#112233" }, value: "A" }],
			},
			{
				type: "TEXT",
				style: { color: "#000000" },
				children: [{ type: "TEXT", style: { color: "#112233" }, value: "A" }],
			},
		],
	] as const)("detects %s tampering", (_name, legacy, semantic) => {
		expect(compareLegacyParityHostNodes(legacy, semantic)).not.toEqual([]);
	});

	it("normalizes only presentation-neutral empty Text artifacts", () => {
		expect(
			compareLegacyParityHostNodes(
				{
					type: "VIEW",
					style: { color: "#112233" },
					children: [{ type: "TEXT" }, { type: "TEXT", value: "same" }],
				},
				{
					type: "VIEW",
					style: { color: "#112233" },
					children: [{ type: "TEXT", value: "same" }],
				},
			),
		).toEqual([]);

		for (const meaningfulEmptyText of [
			{ type: "TEXT", style: { backgroundColor: "#112233" } },
			{ type: "TEXT", style: { width: 1 } },
			{ type: "TEXT", props: { id: "semantic-payload" } },
		] satisfies LegacyParityHostNode[]) {
			expect(
				compareLegacyParityHostNodes({ type: "VIEW", children: [meaningfulEmptyText] }, { type: "VIEW", children: [] }),
			).not.toEqual([]);
		}
	});

	it("retains legitimate inheritance and renderer-default equivalence", () => {
		expect(
			compareLegacyParityHostNodes(
				{
					type: "TEXT",
					style: { color: "rgb(18, 52, 86)", fontWeight: 400 },
					children: [{ type: "TEXT", value: "same" }],
				},
				{ type: "TEXT", style: { color: "#123456" }, children: [{ type: "TEXT", value: "same" }] },
			),
		).toEqual([]);
	});
});
