import { describe, expect, it } from "vitest";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { getResumeExportData } from "./export-sections";
import { buildMarkdown, htmlToMarkdown } from "./markdown";

describe("htmlToMarkdown", () => {
	it("converts the constrained tiptap tag set", () => {
		const html = "<p>Led <strong>teams</strong> of <em>engineers</em>.</p><ul><li>Shipped X</li><li>Owned Y</li></ul>";
		expect(htmlToMarkdown(html)).toBe("Led **teams** of _engineers_.\n\n- Shipped X\n- Owned Y");
	});

	it("converts anchors to Markdown links and decodes entities", () => {
		expect(htmlToMarkdown('<p>See <a href="https://x.com">Tom &amp; Jerry</a></p>')).toBe(
			"See [Tom & Jerry](https://x.com)",
		);
	});

	it("returns an empty string for empty input", () => {
		expect(htmlToMarkdown("")).toBe("");
	});
});

describe("buildMarkdown", () => {
	// Section titles are stored empty and resolved by the caller; mimic that with a simple resolver.
	const resolveTitle = (sectionId: string) =>
		({ summary: "Summary", experience: "Experience", education: "Education" })[sectionId];
	const md = buildMarkdown(getResumeExportData(sampleResumeData, "resume"), resolveTitle);

	it("emits the name as an H1 and headline as emphasis", () => {
		expect(md.startsWith(`# ${sampleResumeData.basics.name}`)).toBe(true);
		expect(md).toContain(`_${sampleResumeData.basics.headline}_`);
	});

	it("renders resolved section headings as H2", () => {
		expect(md).toContain("## Experience");
	});

	it("falls back to the stored title when no resolver is given", () => {
		const bare = buildMarkdown(getResumeExportData(sampleResumeData, "resume"));
		expect(bare).not.toContain("## Experience");
	});

	it("ends with a single trailing newline and never contains raw HTML tags", () => {
		expect(md.endsWith("\n")).toBe(true);
		expect(md).not.toMatch(/<[a-z][^>]*>/i);
	});

	it("excludes the cover letter from the resume scope and includes it in the cover-letter scope", () => {
		const cover = buildMarkdown(getResumeExportData(sampleResumeData, "cover-letter"));
		expect(cover.length).toBeGreaterThan(0);
		expect(cover).not.toBe(md);
	});
});
