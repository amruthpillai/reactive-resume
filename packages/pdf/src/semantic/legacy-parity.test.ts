import type { ResumeData, StyleRule } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { styleRulesSchema } from "@reactive-resume/schema/resume/data";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { convertLegacyStyleRules } from "./legacy-converter";
import { compareLegacySemanticPresentation } from "./legacy-parity";

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
			roles: [],
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
	data.metadata.layout.pages = [{ fullWidth: true, main: ["summary", "experience", "skills", "awards"], sidebar: [] }];
	data.metadata.styleRules = rules;
	return data;
};

describe("compareLegacySemanticPresentation", () => {
	it.each([
		"link-underline-3134",
		"rich-text-all-slots",
		"icon-level-size",
		"award-unbold",
		"primary-text-bold-3146",
	] as const)("matches final primitive props for %s", async (fixture) => {
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
});
