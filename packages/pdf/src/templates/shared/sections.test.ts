import type { SkillItem } from "@reactive-resume/schema/resume/data";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getTemplateMetrics } from "./metrics";
import { getSectionHeadingTextStyle, getSkillsItemStyle } from "./sections";

const source = readFileSync(fileURLToPath(new URL("./sections.tsx", import.meta.url)), "utf8");

describe("ExperienceSection", () => {
	it("does not hide the item position header when role progression is present", () => {
		expect(source).not.toContain("item.roles.length === 0 && (hasPosition || hasSplitRowText(headerPeriod))");
	});

	it("does not repeat the summary period after rendering it in a role-progression header", () => {
		expect(source).not.toContain("item.roles.length > 0 && <Text>{item.period}</Text>");
	});
});

describe("ItemTitle", () => {
	it("renders award titles without the bold style", () => {
		expect(source).toContain("const ItemTitle = ({ children, website, field, bold = true }: ItemTitleProps)");
		expect(source).toContain("const title = bold ? (\n\t\t<Bold style={style} semanticField={field}>");
		expect(source).toContain("\t) : (\n\t\t<Text style={style} semanticField={field}>");
		expect(source).toContain('<ItemTitle field="title" website={item.website} bold={false}>');
	});
});

describe("SectionShell", () => {
	it("keeps heading text safety padding separate from container padding", () => {
		expect(getSectionHeadingTextStyle({ paddingLeft: 0 })).toEqual([{ paddingLeft: 1 }]);
		expect(getSectionHeadingTextStyle({ paddingLeft: 6 })).toEqual([{ paddingLeft: 1 }]);
	});

	it("keeps section and heading style rules when section heading icons are hidden", () => {
		expect(source).toContain(
			"const resolvedSectionStyle = composeStyles(sectionStyle, sectionRuleStyle, resolved.style)",
		);
		expect(source).toContain("<View style={resolvedSectionStyle} {...flowProps}>");
		expect(source).toContain("<Heading style={composeStyles(sectionHeadingStyle, sectionHeadingRuleStyle)}>");
	});

	it("wires the section heading container style slot into the icon row", () => {
		expect(source).toContain('useTemplateStyle("sectionHeadingContainer")');
		expect(source).toContain("sectionHeadingContainerStyle");
	});

	it("top-aligns heading icon rows and does not use unsupported auto width resets", () => {
		const headingContainerBlock = source.match(
			/const defaultSectionHeadingContainerStyle = {(?<body>[\s\S]*?)} satisfies Style;/,
		);

		expect(headingContainerBlock?.groups?.body).toContain('alignItems: "flex-start"');
		expect(source).toMatch(/getSectionHeadingTextStyle\(\s*sectionHeadingStyle,\s*sectionHeadingRuleStyle(?:,|\))/);
		expect(source).toContain("width: _width");
		expect(source).not.toContain('width: "auto"');
	});
});

const mockMetrics = getTemplateMetrics({ gapX: 10, gapY: 10, marginX: 10, marginY: 10 });

const createSkillItem = (overrides: Partial<SkillItem> = {}): SkillItem => ({
	id: "1",
	name: "JavaScript",
	level: 0,
	keywords: [],
	hidden: false,
	proficiency: "",
	icon: "",
	iconColor: "",
	...overrides,
});

describe("SkillsSectionInlineFormat", () => {
	it("uses isInlineSkillsItem in sections.tsx", () => {
		expect(source).toContain("isInlineSkillsItem");
	});

	it("returns default rowGap style when isInline is false", () => {
		const mockItem = createSkillItem();
		expect(getSkillsItemStyle(false, mockItem, mockMetrics)).toEqual({ rowGap: 2.5 });
	});

	it("does not apply alignItems: center when isInline is true and 0 secondary fields are present", () => {
		// 0 secondary fields: no proficiency, no level, no keywords
		const mockItem = createSkillItem();
		const style = getSkillsItemStyle(true, mockItem, mockMetrics);
		expect(style).not.toEqual(expect.arrayContaining([{ alignItems: "center" }]));
	});

	it("applies alignItems: center when isInline is true and exactly 1 secondary field is present", () => {
		// 1 secondary field: level only
		const mockItem = createSkillItem({ level: 3 });
		const style = getSkillsItemStyle(true, mockItem, mockMetrics);
		expect(style).toEqual(expect.arrayContaining([{ alignItems: "center" }]));
	});

	it("applies alignItems: center when isInline is true and proficiency is the only secondary field", () => {
		// 1 secondary field: proficiency only
		const mockItem = createSkillItem({ proficiency: "Advanced" });
		const style = getSkillsItemStyle(true, mockItem, mockMetrics);
		expect(style).toEqual(expect.arrayContaining([{ alignItems: "center" }]));
	});

	it("applies alignItems: center when isInline is true and keywords is the only secondary field", () => {
		// 1 secondary field: keywords only
		const mockItem = createSkillItem({ keywords: ["React", "TypeScript"] });
		const style = getSkillsItemStyle(true, mockItem, mockMetrics);
		expect(style).toEqual(expect.arrayContaining([{ alignItems: "center" }]));
	});

	it("does not apply alignItems: center when isInline is true and 2 secondary fields are present", () => {
		// 2 secondary fields: level AND keywords
		const mockItem = createSkillItem({ level: 3, keywords: ["React"] });
		const style = getSkillsItemStyle(true, mockItem, mockMetrics);
		expect(style).not.toEqual(expect.arrayContaining([{ alignItems: "center" }]));
	});

	it("does not apply alignItems: center when isInline is true and 3 secondary fields are present", () => {
		// 3 secondary fields: proficiency, level, AND keywords
		const mockItem = createSkillItem({ proficiency: "Advanced", level: 3, keywords: ["React"] });
		const style = getSkillsItemStyle(true, mockItem, mockMetrics);
		expect(style).not.toEqual(expect.arrayContaining([{ alignItems: "center" }]));
	});
});
