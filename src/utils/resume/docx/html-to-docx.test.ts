// @vitest-environment jsdom

import { ExternalHyperlink, Paragraph, TextRun } from "docx";
import { describe, expect, it } from "vitest";
import { htmlToParagraphs } from "./html-to-docx";

// Helper to extract the internal children array from a Paragraph.
// docx stores children in the `root` property's internal array.
function getChildren(paragraph: Paragraph): unknown[] {
	// biome-ignore lint/suspicious/noExplicitAny: accessing internal docx structure for testing
	const root = (paragraph as any).root;
	if (Array.isArray(root)) return root;
	return [];
}

describe("htmlToParagraphs", () => {
	it("returns empty array for empty string", () => {
		expect(htmlToParagraphs("")).toEqual([]);
	});

	it("returns empty array for whitespace-only string", () => {
		expect(htmlToParagraphs("   ")).toEqual([]);
	});

	it("parses a plain paragraph", () => {
		const result = htmlToParagraphs("<p>Hello</p>");
		expect(result).toHaveLength(1);
		expect(result[0]).toBeInstanceOf(Paragraph);
	});

	it("parses bold text", () => {
		const result = htmlToParagraphs("<p><strong>Bold</strong></p>");
		expect(result).toHaveLength(1);

		const paragraph = result[0];
		expect(paragraph).toBeDefined();
		const children = getChildren(paragraph as Paragraph);
		const textRuns = children.filter((c) => c instanceof TextRun);
		expect(textRuns.length).toBeGreaterThanOrEqual(1);
	});

	it("parses italic text", () => {
		const result = htmlToParagraphs("<p><em>Italic</em></p>");
		expect(result).toHaveLength(1);

		const paragraph = result[0];
		expect(paragraph).toBeDefined();
		const children = getChildren(paragraph as Paragraph);
		const textRuns = children.filter((c) => c instanceof TextRun);
		expect(textRuns.length).toBeGreaterThanOrEqual(1);
	});

	it("parses nested bold and italic", () => {
		const result = htmlToParagraphs("<p><strong><em>Both</em></strong></p>");
		expect(result).toHaveLength(1);
	});

	it("parses unordered list", () => {
		const result = htmlToParagraphs("<ul><li>A</li><li>B</li></ul>");
		expect(result).toHaveLength(2);
	});

	it("parses ordered list", () => {
		const result = htmlToParagraphs("<ol><li>A</li><li>B</li></ol>");
		expect(result).toHaveLength(2);
	});

	it("parses hyperlink", () => {
		const result = htmlToParagraphs('<p><a href="https://example.com">Link</a></p>');
		expect(result).toHaveLength(1);

		const paragraph = result[0];
		expect(paragraph).toBeDefined();
		const children = getChildren(paragraph as Paragraph);
		const hyperlinks = children.filter((c) => c instanceof ExternalHyperlink);
		expect(hyperlinks.length).toBeGreaterThanOrEqual(1);
	});

	it("parses mixed inline formatting", () => {
		const result = htmlToParagraphs("<p>Normal <strong>bold</strong> end</p>");
		expect(result).toHaveLength(1);

		const paragraph = result[0];
		expect(paragraph).toBeDefined();
		const children = getChildren(paragraph as Paragraph);
		// Should have multiple TextRuns: "Normal ", bold "bold", " end"
		const textRuns = children.filter((c) => c instanceof TextRun);
		expect(textRuns.length).toBeGreaterThanOrEqual(2);
	});

	it("parses multiple paragraphs", () => {
		const result = htmlToParagraphs("<p>A</p><p>B</p>");
		expect(result).toHaveLength(2);
	});

	it("parses line break within paragraph", () => {
		const result = htmlToParagraphs("<p>Line1<br>Line2</p>");
		expect(result).toHaveLength(1);

		const paragraph = result[0];
		expect(paragraph).toBeDefined();
		// Should contain TextRuns with a break between
		const children = getChildren(paragraph as Paragraph);
		expect(children.length).toBeGreaterThanOrEqual(2);
	});

	it("handles empty paragraph gracefully", () => {
		const result = htmlToParagraphs("<p></p>");
		// Empty paragraphs may be skipped
		expect(result).toHaveLength(0);
	});

	it("parses strikethrough text", () => {
		const result = htmlToParagraphs("<p><s>struck</s></p>");
		expect(result).toHaveLength(1);
	});

	it("parses underline text", () => {
		const result = htmlToParagraphs("<p><u>under</u></p>");
		expect(result).toHaveLength(1);
	});
});
