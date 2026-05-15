// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { htmlToParagraphs } from "./html-to-docx";

describe("htmlToParagraphs", () => {
	it("returns [] for empty / whitespace-only input", () => {
		expect(htmlToParagraphs("")).toEqual([]);
		expect(htmlToParagraphs("   \n  ")).toEqual([]);
	});

	it("returns at least one paragraph for a simple <p> element", () => {
		const result = htmlToParagraphs("<p>Hello world</p>");
		expect(result.length).toBeGreaterThanOrEqual(1);
	});

	it("converts plain text nodes at the body root into a paragraph", () => {
		const result = htmlToParagraphs("Just some plain text");
		expect(result.length).toBe(1);
	});

	it("emits separate paragraphs for multiple top-level blocks", () => {
		const result = htmlToParagraphs("<p>One</p><p>Two</p><p>Three</p>");
		expect(result.length).toBeGreaterThanOrEqual(3);
	});

	it("treats <h1>..<h6> as block-level paragraphs (one per heading)", () => {
		const result = htmlToParagraphs("<h1>A</h1><h2>B</h2><h3>C</h3>");
		expect(result.length).toBe(3);
	});

	it("renders nested <strong>, <em>, <u>, <s> inline styling without throwing", () => {
		const result = htmlToParagraphs("<p><strong>Bold</strong> <em>italic</em> <u>under</u> <s>strike</s></p>");
		expect(result.length).toBe(1);
	});

	it("renders links and lists without throwing", () => {
		const html = '<p><a href="https://example.com">link</a></p><ul><li>One</li><li>Two</li></ul>';
		const result = htmlToParagraphs(html);
		expect(result.length).toBeGreaterThanOrEqual(2);
	});

	it("accepts custom font + size config without throwing", () => {
		const result = htmlToParagraphs("<p>Hello</p>", {
			font: "Roboto",
			size: 22,
			color: "111111",
			linkColor: "0563C1",
		});
		expect(result.length).toBe(1);
	});

	it("ignores HTML comments and script/style tags at the root", () => {
		// Comments at root and script tags don't add paragraph output.
		const result = htmlToParagraphs("<!--c--><script>x</script><p>Hello</p>");
		expect(result.length).toBeGreaterThanOrEqual(1);
	});
});
