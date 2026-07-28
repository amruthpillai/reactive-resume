import type { ResumeData, StyleRule } from "@reactive-resume/schema/resume/data";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compileStylesheet } from "@reactive-resume/resume/stylesheet";
import { styleRulesSchema } from "@reactive-resume/schema/resume/data";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { convertLegacyStyleRules } from "./legacy-converter";

const fixtureUrl = (name: string) => new URL(`./__fixtures__/legacy/${name}`, import.meta.url);
const readFixture = (name: string): unknown => JSON.parse(readFileSync(fixtureUrl(`${name}.json`), "utf8"));
const readExpected = (name: string): string => readFileSync(fixtureUrl(`${name}.expected.css`), "utf8");

const dataWithRules = (name: string): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.metadata.styleRules = readFixture(name) as StyleRule[];
	return data;
};

describe("convertLegacyStyleRules", () => {
	it("preserves legacy specificity and source-order ties deterministically", () => {
		const converted = convertLegacyStyleRules(dataWithRules("merge-specificity"));
		const tie = convertLegacyStyleRules(dataWithRules("array-order-tie"));

		expect(converted.source).toEqual({
			languageVersion: 1,
			text: readExpected("merge-specificity"),
		});
		expect(tie.source.text.indexOf("/* First */")).toBeLessThan(tie.source.text.indexOf("/* Second */"));
		expect(compileStylesheet(converted.source).program).not.toBeNull();
	});

	it("sanitizes #3199 intent data and applies the existing PDF clamps", () => {
		const sanitized = convertLegacyStyleRules(dataWithRules("sanitized-intent-3199"));
		const clamped = convertLegacyStyleRules(dataWithRules("clamped-spacing"));

		expect(sanitized.sanitizedRules).toEqual(styleRulesSchema.parse(readFixture("sanitized-intent-3199")));
		expect(sanitized.source.text).toContain("color: #123456;");
		expect(sanitized.source.text).not.toMatch(/huge|unknown-property|unknown-slot|#ffffff/i);
		expect(clamped.source.text).toContain("border-width: 24pt;");
		expect(clamped.source.text).toContain("border-radius: 72pt;");
	});

	it("comments disabled and final-host no-effect declarations without inventing @rr-disabled", () => {
		const disabled = convertLegacyStyleRules(dataWithRules("disabled-rules")).source.text;
		const links = convertLegacyStyleRules(dataWithRules("link-underline-3134")).source.text;

		expect(disabled).toContain("Disabled legacy rule");
		expect(disabled).toContain("Disabled *\\/ cannot escape");
		expect(disabled).not.toContain("@rr-disabled");
		expect(links).toContain("color: #2255aa;");
		expect(links).toContain("No effect in legacy rendering: text-decoration");
		expect(links).not.toMatch(/^[^/]*\btext-decoration:/m);
	});

	it("maps every rich-text slot to its real semantic host", () => {
		const source = convertLegacyStyleRules(dataWithRules("rich-text-all-slots")).source.text;

		expect(source).toContain("rich-text paragraph");
		expect(source).toContain("rich-text list {");
		expect(source).toContain("rich-text list-item {");
		expect(source).toContain("rich-text list-item-content {");
		expect(source).toContain("rich-text link {");
		expect(source).toContain("rich-text strong {");
		expect(source).toContain("rich-text mark {");
		expect(compileStylesheet({ languageVersion: 1, text: source }).program).not.toBeNull();
	});

	it("preserves Bold-after-text #3146 while retaining the award unbold exception", () => {
		const primary = convertLegacyStyleRules(dataWithRules("primary-text-bold-3146")).source.text;
		const award = convertLegacyStyleRules(dataWithRules("award-unbold")).source.text;

		expect(primary).toContain('[role~="primary-text"]');
		expect(primary).not.toContain('section[type="awards"] field[name="title"]');
		expect(primary).toContain("font-weight: 400;");
		expect(primary).toContain('resume[template="scizor"] section[type="experience"]');
		expect(primary).toContain("Scizor Bold final color");
		expect(award).toContain('section[type="awards"] field[name="title"]');
	});

	it("translates icon and level font sizes to explicit geometry", () => {
		const source = convertLegacyStyleRules(dataWithRules("icon-level-size")).source.text;

		expect(source).toMatch(/icon \{[\s\S]*height: 18pt;[\s\S]*width: 18pt;/);
		expect(source).toMatch(/level \{[\s\S]*font-size: 14pt;/);
		expect(source).toMatch(/level > icon \{[\s\S]*height: 14pt;[\s\S]*width: 14pt;/);
	});

	it("uses portable custom-section types and quoted UUID section IDs", () => {
		const custom = convertLegacyStyleRules(dataWithRules("custom-section-type")).source.text;
		const uuid = convertLegacyStyleRules(dataWithRules("section-id-uuid")).source.text;

		expect(custom).toContain('section[type="experience"] item');
		expect(uuid).toContain('section[id="1d7312cb-9ba2-4d42-9ca8-2a9ca05f9f37"] > section-heading');
	});

	it("compiles the all-template portable smoke fixture", () => {
		const result = convertLegacyStyleRules(dataWithRules("all-templates-smoke"));
		expect(compileStylesheet(result.source).diagnostics.filter(({ severity }) => severity === "error")).toEqual([]);
	});
});
