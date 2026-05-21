import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { Text as PdfText } from "@react-pdf/renderer";
import { parse } from "node-html-parser";
import { createElement } from "react";
import { normalizeRichTextHtml } from "./rich-text-html";
import { renderRichTextParagraph } from "./rich-text-renderers";

type PdfElement = ReactElement<{ children?: unknown; style?: unknown }>;

const getPdfElementProps = (element: unknown) => (element as PdfElement).props;

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

describe("renderRichTextParagraph", () => {
	it("keeps unmarked paragraph text inside a PDF text node", () => {
		const paragraph = parse("<p>Plain <strong>bold</strong> text</p>").querySelector("p");

		if (!paragraph) throw new Error("Expected paragraph to exist.");

		const rendered = renderRichTextParagraph({
			element: paragraph,
			style: { fontSize: 10 },
			children: ["Plain ", createElement(PdfText, { key: "bold" }, "bold"), " text"],
		});
		const props = getPdfElementProps(rendered);

		expect(rendered.type).toBe(PdfText);
		expect(props.children).toEqual(["Plain ", expect.any(Object), " text"]);
	});
});
