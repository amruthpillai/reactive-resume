import type { ResumeData, StyleRule } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import pixelmatch from "pixelmatch";
import { createElement } from "react";
import { styleRulesSchema } from "@reactive-resume/schema/resume/data";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../document";
import { convertLegacyStyleRules } from "./legacy-converter";
import { rasterizePdf } from "./test/rasterize-pdf";

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

const fixtureNames = [
	"all-templates-smoke",
	"array-order-tie",
	"award-unbold",
	"clamped-spacing",
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

const readRules = (name: string): StyleRule[] =>
	styleRulesSchema.parse(
		JSON.parse(readFileSync(new URL(`./__fixtures__/legacy/${name}.json`, import.meta.url), "utf8")),
	);

const buildFixture = (rules: StyleRule[]): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics.name = "Ada Lovelace";
	data.basics.headline = "Engineer";
	data.basics.email = "ada@example.com";
	data.summary.hidden = false;
	data.summary.content =
		'<p>Paragraph <strong>bold</strong> <mark>mark</mark> <a href="https://example.com">link</a></p><ul><li>List item</li></ul>';
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
	data.sections.experience.items = [
		{
			id: "experience",
			hidden: false,
			company: "Analytical Engines",
			position: "Engineer",
			location: "London",
			period: "1842",
			website: { url: "", label: "", inlineLink: false },
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
			main: ["summary", "experience", "skills", "awards", "1d7312cb-9ba2-4d42-9ca8-2a9ca05f9f37"],
			sidebar: [],
		},
	];
	data.metadata.styleRules = [...rules];
	return data;
};

const render = async (data: ResumeData, template: Template): Promise<Uint8Array> => {
	const document = createElement(ResumeDocument, { data, template }) as unknown as Parameters<typeof renderToBuffer>[0];
	return new Uint8Array(await renderToBuffer(document));
};

const semanticData = (data: ResumeData): ResumeData => {
	const conversion = convertLegacyStyleRules(data);
	const semantic = structuredClone(data);
	semantic.metadata.styleRules = [...conversion.sanitizedRules];
	semantic.metadata.stylesheet = { mode: "semantic", source: conversion.source, applied: conversion.source };
	return semantic;
};

type RasterComparison = {
	pixelDiffRatio: number;
	mismatches: readonly string[];
};

const comparePdfRasters = async (legacy: Uint8Array, semantic: Uint8Array): Promise<RasterComparison> => {
	const legacyPages = await rasterizePdf(legacy);
	const semanticPages = await rasterizePdf(semantic);
	const mismatches: string[] = [];
	if (legacyPages.length !== semanticPages.length) {
		mismatches.push(`page count: legacy=${legacyPages.length} semantic=${semanticPages.length}`);
	}

	let changed = 0;
	let pixels = 0;
	for (const [index, legacyPage] of legacyPages.entries()) {
		const semanticPage = semanticPages[index];
		if (!semanticPage) continue;
		if (semanticPage.width !== legacyPage.width || semanticPage.height !== legacyPage.height) {
			mismatches.push(
				`page ${index + 1} dimensions: legacy=${legacyPage.width}x${legacyPage.height} semantic=${semanticPage.width}x${semanticPage.height}`,
			);
			continue;
		}
		const changedOnPage = pixelmatch(
			legacyPage.data,
			semanticPage.data,
			undefined,
			legacyPage.width,
			legacyPage.height,
			{ threshold: 0 },
		);
		if (changedOnPage > 0) {
			mismatches.push(`page ${index + 1} pixels: changed=${changedOnPage}/${legacyPage.width * legacyPage.height}`);
		}
		changed += changedOnPage;
		pixels += legacyPage.width * legacyPage.height;
	}
	return { pixelDiffRatio: pixels === 0 ? (mismatches.length > 0 ? 1 : 0) : changed / pixels, mismatches };
};

describe("legacy activation raster parity", () => {
	it.each(fixtureNames)(
		"has zero real-PDF pixel drift for %s",
		async (fixture) => {
			const legacy = buildFixture(readRules(fixture));
			const semantic = semanticData(legacy);

			expect(await comparePdfRasters(await render(legacy, "onyx"), await render(semantic, "onyx"))).toEqual({
				pixelDiffRatio: 0,
				mismatches: [],
			});
		},
		30_000,
	);

	it.each(templates)(
		"smoke-renders %s without activation pixel drift",
		async (template) => {
			const legacy = buildFixture(readRules("all-templates-smoke"));
			const semantic = semanticData(legacy);

			expect(await comparePdfRasters(await render(legacy, template), await render(semantic, template))).toEqual({
				pixelDiffRatio: 0,
				mismatches: [],
			});
		},
		30_000,
	);
});
