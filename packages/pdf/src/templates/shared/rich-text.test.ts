import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { Text as PdfText } from "@react-pdf/renderer";
import { parse } from "node-html-parser";
import { createElement } from "react";
import { normalizeRichTextHtml } from "./rich-text-html";
import { renderRichTextParagraph } from "./rich-text-renderers";
import { createRichTextStylesheet } from "./rich-text-stylesheet";

type PdfElement = ReactElement<{ children?: unknown; style?: unknown }>;

const getPdfElementProps = (element: unknown) => (element as PdfElement).props;
const mergeStyle = (style: unknown): Record<string, unknown> =>
	Object.assign({}, ...(Array.isArray(style) ? style : style ? [style] : []));

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
			"<p>Existing paragraph.</p><ul><li>Existing item.</li></ul>",
		);
	});

	it("wraps inline runs around top-level blocks", () => {
		expect(normalizeRichTextHtml("Intro <strong>text</strong><ul><li><p>Item</p></li></ul>Outro")).toBe(
			"<p>Intro <strong>text</strong></p><ul><li>Item</li></ul><p>Outro</p>",
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

	it("keeps semantic paragraph margins after prose edge trimming while preserving text safety", () => {
		const paragraph = parse("<p>First</p><p>Second</p>").querySelector("p");

		if (!paragraph) throw new Error("Expected paragraph to exist.");

		const rendered = renderRichTextParagraph({
			element: paragraph,
			style: { marginTop: 4, marginBottom: 4 },
			semanticStyle: {
				marginTop: 20,
				marginBottom: 21,
				minWidth: 72,
				maxWidth: 72,
				flexShrink: 0,
			},
			children: "First",
		});

		expect(mergeStyle(getPdfElementProps(rendered).style)).toMatchObject({
			marginTop: 20,
			marginBottom: 21,
			minWidth: 0,
			maxWidth: "100%",
			flexShrink: 1,
		});
	});
});

describe("createRichTextStylesheet", () => {
	it("applies list style rules to unordered and ordered list containers", () => {
		const stylesheet = createRichTextStylesheet({
			richListRuleStyle: { rowGap: 8 },
			proseSpacing: {
				paragraph: { marginTop: 12, marginBottom: 12 },
				listItem: { marginTop: 2, marginBottom: 2 },
			},
		});

		expect(stylesheet.ul).toEqual({ rowGap: 8 });
		expect(stylesheet.ol).toEqual({ rowGap: 8 });
		expect(stylesheet.li).toEqual({ marginTop: 2, marginBottom: 2 });
	});

	it("can force rich text links to render without underlines", () => {
		const stylesheet = createRichTextStylesheet({
			hideLinkUnderline: true,
			richLinkRuleStyle: { textDecoration: "underline", textDecorationStyle: "dotted" },
		});

		expect(stylesheet.a).toMatchObject({ textDecoration: "none", textDecorationStyle: "dotted" });
	});
});
