import { describe, expect, it } from "vitest";
import { resumeDataSchema } from "./data";
import { defaultResumeData } from "./default";

describe("defaultResumeData", () => {
	it("conforms to resumeDataSchema", () => {
		const result = resumeDataSchema.safeParse(defaultResumeData);
		expect(result.success).toBe(true);
	});

	it("uses the 'onyx' template", () => {
		expect(defaultResumeData.metadata.template).toBe("onyx");
	});

	it("uses en-US locale", () => {
		expect(defaultResumeData.metadata.page.locale).toBe("en-US");
	});

	it("uses A4 format by default", () => {
		expect(defaultResumeData.metadata.page.format).toBe("a4");
	});

	it("uses cover picture fitting by default", () => {
		expect(defaultResumeData.picture.fit).toBe("cover");
	});

	it("shows link underlines by default", () => {
		expect(defaultResumeData.metadata.page.hideLinkUnderline).toBe(false);
	});

	it("starts with no resume content", () => {
		expect(defaultResumeData.basics.name).toBe("");
		expect(defaultResumeData.summary.content).toBe("");
		for (const section of Object.values(defaultResumeData.sections)) {
			expect(section.items).toEqual([]);
		}
	});

	it("has exactly one default page layout", () => {
		expect(defaultResumeData.metadata.layout.pages).toHaveLength(1);
	});

	it("default page has standard main and sidebar columns", () => {
		const page = defaultResumeData.metadata.layout.pages[0];
		expect(page).toBeDefined();
		expect(page?.main).toContain("experience");
		expect(page?.main).toContain("education");
		expect(page?.sidebar).toContain("skills");
	});

	it("uses serif font family for body", () => {
		expect(defaultResumeData.metadata.typography.body.fontFamily).toBe("IBM Plex Serif");
	});

	it("default sidebar width is 35%", () => {
		expect(defaultResumeData.metadata.layout.sidebarWidth).toBe(35);
	});

	it("custom sections are empty", () => {
		expect(defaultResumeData.customSections).toEqual([]);
	});
});
