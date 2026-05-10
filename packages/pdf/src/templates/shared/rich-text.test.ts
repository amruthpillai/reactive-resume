import { describe, expect, it } from "vitest";
import { normalizeRichTextHtml } from "./rich-text-html";

describe("normalizeRichTextHtml", () => {
	it("wraps top-level inline rich text in a paragraph", () => {
		const html =
			"Passionate game developer with 5+ years of professional experience</strong> creating engaging gameplay. <a href='https://www.google.com'>Specialized</a> in Unity.";

		expect(normalizeRichTextHtml(html)).toBe(
			"<p>Passionate game developer with 5+ years of professional experience creating engaging gameplay. <a href='https://www.google.com'>Specialized</a> in Unity.</p>",
		);
	});

	it("preserves existing block rich text", () => {
		expect(normalizeRichTextHtml("<p>Existing paragraph.</p><ul><li><p>Existing item.</p></li></ul>")).toBe(
			"<p>Existing paragraph.</p><ul><li><p>Existing item.</p></li></ul>",
		);
	});

	it("wraps inline runs around top-level blocks", () => {
		expect(normalizeRichTextHtml("Intro <strong>text</strong><ul><li><p>Item</p></li></ul>Outro")).toBe(
			"<p>Intro <strong>text</strong></p><ul><li><p>Item</p></li></ul><p>Outro</p>",
		);
	});
});
