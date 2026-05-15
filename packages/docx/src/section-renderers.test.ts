// @vitest-environment happy-dom

import type { CustomSection, ResumeData, SectionType } from "@reactive-resume/schema/resume/data";
import { describe, expect, it } from "vitest";
import { renderBuiltInSection, renderCustomSection, renderSummary, setRenderConfig } from "./section-renderers";

const baseConfig = {
	headingFont: "Inter",
	headingSizeHalfPt: 28,
	bodyFont: "Inter",
	bodySizeHalfPt: 20,
	textColorHex: "111111",
	primaryColorHex: "0563C1",
};

setRenderConfig(baseConfig);

const HEX = "#0563C1";

describe("renderSummary", () => {
	it("returns [] when the section is hidden", () => {
		const summary: ResumeData["summary"] = {
			title: "Summary",
			content: "<p>Hello</p>",
			hidden: true,
			columns: 1,
		};
		expect(renderSummary(summary, HEX)).toEqual([]);
	});

	it("returns [] when content is empty", () => {
		const summary: ResumeData["summary"] = {
			title: "Summary",
			content: "",
			hidden: false,
			columns: 1,
		};
		expect(renderSummary(summary, HEX)).toEqual([]);
	});

	it("includes a heading paragraph when both title and content are present", () => {
		const summary: ResumeData["summary"] = {
			title: "Summary",
			content: "<p>Hello world</p>",
			hidden: false,
			columns: 1,
		};
		const paragraphs = renderSummary(summary, HEX);
		// One heading + the htmlToParagraphs output for one <p>.
		expect(paragraphs.length).toBeGreaterThanOrEqual(2);
	});

	it("omits the heading when title is empty but still renders content", () => {
		const summary: ResumeData["summary"] = {
			title: "",
			content: "<p>Hello world</p>",
			hidden: false,
			columns: 1,
		};
		const paragraphs = renderSummary(summary, HEX);
		expect(paragraphs.length).toBeGreaterThanOrEqual(1);
	});
});

const emptySection = <T extends SectionType>(_type: T): ResumeData["sections"][T] =>
	({
		title: "Section",
		columns: 1,
		hidden: false,
		items: [],
	}) as ResumeData["sections"][T];

describe("renderBuiltInSection", () => {
	it("returns [] when the section has no items", () => {
		expect(renderBuiltInSection("experience", emptySection("experience"), HEX)).toEqual([]);
	});

	it("returns [] when section.hidden is true", () => {
		const section = { ...emptySection("experience"), hidden: true };
		expect(renderBuiltInSection("experience", section, HEX)).toEqual([]);
	});

	it("returns [] for an unknown section type", () => {
		expect(renderBuiltInSection("not-a-section" as never, emptySection("experience"), HEX)).toEqual([]);
	});
});

describe("renderCustomSection", () => {
	const baseCustom: CustomSection = {
		id: "custom-1",
		type: "summary",
		title: "Notes",
		columns: 1,
		hidden: false,
		items: [],
	};

	it("returns [] when the custom section is hidden", () => {
		expect(renderCustomSection({ ...baseCustom, hidden: true }, HEX)).toEqual([]);
	});

	it("returns [] when all items are hidden or empty", () => {
		const section: CustomSection = {
			...baseCustom,
			items: [{ id: "x", hidden: true } as never],
		};
		expect(renderCustomSection(section, HEX)).toEqual([]);
	});

	it("returns [] for an unknown custom section type", () => {
		const section: CustomSection = {
			...baseCustom,
			type: "no-such-type" as never,
			items: [{ id: "x", hidden: false, content: "<p>x</p>" } as never],
		};
		expect(renderCustomSection(section, HEX)).toEqual([]);
	});

	it("renders content for a summary-type custom section", () => {
		const section: CustomSection = {
			...baseCustom,
			type: "summary",
			items: [{ id: "x", hidden: false, content: "<p>Hello</p>" } as never],
		};
		const paragraphs = renderCustomSection(section, HEX);
		// 1 heading + at least one paragraph for the HTML
		expect(paragraphs.length).toBeGreaterThanOrEqual(2);
	});

	it("renders recipient + content for a cover-letter custom section", () => {
		const section: CustomSection = {
			...baseCustom,
			type: "cover-letter",
			items: [
				{
					id: "x",
					hidden: false,
					recipient: "<p>Dear Jane,</p>",
					content: "<p>Body</p>",
				} as never,
			],
		};
		const paragraphs = renderCustomSection(section, HEX);
		// 1 heading + at least two paragraphs (recipient + body)
		expect(paragraphs.length).toBeGreaterThanOrEqual(3);
	});
});

describe("setRenderConfig", () => {
	it("can be called repeatedly with a different config (no throw)", () => {
		expect(() => setRenderConfig({ ...baseConfig, headingFont: "Roboto", primaryColorHex: "ff0000" })).not.toThrow();

		// Restore for any later tests in the file
		setRenderConfig(baseConfig);
	});
});
