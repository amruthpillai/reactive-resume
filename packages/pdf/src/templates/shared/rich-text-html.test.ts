import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { renderHtml } from "react-pdf-html";
import { Text as PdfText } from "../../renderer";
import {
  convertPseudoBulletParagraphs,
  normalizeRichTextHtml,
  richTextMarkClassName,
} from "./rich-text-html";

type PdfElement = ReactElement<{
  children?: unknown;
  element?: { tag: string };
}>;

const getPdfElementProps = (element: unknown) => (element as PdfElement).props;

describe("normalizeRichTextHtml", () => {
  it("wraps loose inline content in a <p>", () => {
    expect(normalizeRichTextHtml("hello world")).toBe("<p>hello world</p>");
  });

  it("wraps inline tags in a <p>", () => {
    expect(normalizeRichTextHtml("<strong>bold</strong> text")).toBe(
      "<p><strong>bold</strong> text</p>",
    );
  });

  it("preserves block-level <p> as-is", () => {
    expect(normalizeRichTextHtml("<p>Already wrapped</p>")).toBe(
      "<p>Already wrapped</p>",
    );
  });

  it("preserves block-level <ul>", () => {
    const html = "<ul><li>a</li><li>b</li></ul>";
    expect(normalizeRichTextHtml(html)).toBe(html);
  });

  it("flushes accumulated inlines before block-level tags", () => {
    expect(normalizeRichTextHtml("loose<ul><li>a</li></ul>")).toBe(
      "<p>loose</p><ul><li>a</li></ul>",
    );
  });

  it("flushes accumulated inlines after block-level tags", () => {
    expect(normalizeRichTextHtml("<ul><li>a</li></ul>after")).toBe(
      "<ul><li>a</li></ul><p>after</p>",
    );
  });

  it("treats <span> as inline", () => {
    expect(normalizeRichTextHtml("<span>x</span>")).toBe(
      "<p><span>x</span></p>",
    );
  });

  it("maps <mark> to a styled inline span", () => {
    expect(
      normalizeRichTextHtml('<mark class="rounded-md">highlighted</mark> text'),
    ).toBe(
      '<p><span class="rounded-md rr-pdf-mark">highlighted</span> text</p>',
    );
  });

  it("keeps highlighted text in the same react-pdf-html inline text bucket", () => {
    const root = renderHtml(
      normalizeRichTextHtml("before <mark>highlighted</mark> after"),
      {
        resetStyles: true,
        stylesheet: {
          [`.${richTextMarkClassName}`]: { backgroundColor: "#ffff00" },
        },
      },
    );

    const paragraph = getPdfElementProps(root).children;
    const textBucket = getPdfElementProps(paragraph).children as PdfElement;
    const textChildren = getPdfElementProps(textBucket).children as unknown[];
    const highlightedSpan = textChildren[1];

    expect(textBucket.type).toBe(PdfText);
    expect(textChildren).toHaveLength(3);
    expect(textChildren[0]).toBe("before ");
    expect(getPdfElementProps(highlightedSpan).element?.tag).toBe("span");
    expect(getPdfElementProps(highlightedSpan).children).toBe("highlighted");
    expect(textChildren[2]).toBe(" after");
  });

  it("trims input whitespace", () => {
    expect(normalizeRichTextHtml("   text   ")).toBe("<p>text</p>");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeRichTextHtml("")).toBe("");
  });

  it("treats <a> as inline (no need to wrap by itself)", () => {
    expect(normalizeRichTextHtml('<a href="x">link</a>')).toBe(
      '<p><a href="x">link</a></p>',
    );
  });

  it("does not double-wrap inline tags inside block elements", () => {
    expect(normalizeRichTextHtml("<p><strong>x</strong></p>")).toBe(
      "<p><strong>x</strong></p>",
    );
  });
});

describe("convertPseudoBulletParagraphs", () => {
  it("converts a <p> of dash-prefixed lines into a <ul><li> list", () => {
    expect(convertPseudoBulletParagraphs("<p>- a<br>- b<br>- c</p>")).toBe(
      "<ul><li>a</li><li>b</li><li>c</li></ul>",
    );
  });

  it("handles <br> wrapped in inline formatting tags (real editor output)", () => {
    expect(
      convertPseudoBulletParagraphs(
        "<p>- <strong></strong>foo.<strong><br></strong>- bar.</p>",
      ),
    ).toBe("<ul><li>foo.</li><li>bar.</li></ul>");
  });

  it("accepts other bullet markers (• and *)", () => {
    expect(convertPseudoBulletParagraphs("<p>• one<br>* two</p>")).toBe(
      "<ul><li>one</li><li>two</li></ul>",
    );
  });

  it("leaves a paragraph with a single inline <br> untouched", () => {
    const input = "<p>Just a paragraph with a <br> line break.</p>";
    expect(convertPseudoBulletParagraphs(input)).toBe(input);
  });

  it("leaves a single-line dash paragraph untouched (no <br>)", () => {
    const input = "<p>- Just one line</p>";
    expect(convertPseudoBulletParagraphs(input)).toBe(input);
  });

  it("does not convert when one segment lacks a leading bullet marker", () => {
    const input = "<p>- foo<br>bar without dash</p>";
    expect(convertPseudoBulletParagraphs(input)).toBe(input);
  });

  it("leaves a real <ul> alone", () => {
    const input = "<ul><li>a</li><li>b</li></ul>";
    expect(convertPseudoBulletParagraphs(input)).toBe(input);
  });

  it("only converts matching paragraphs in mixed input", () => {
    const input = "<p>- a<br>- b</p><p>just a normal paragraph.</p>";
    expect(convertPseudoBulletParagraphs(input)).toBe(
      "<ul><li>a</li><li>b</li></ul><p>just a normal paragraph.</p>",
    );
  });

  it("preserves non-empty inline formatting inside bullet text", () => {
    expect(
      convertPseudoBulletParagraphs(
        "<p>- foo <strong>bold</strong> bar<br>- baz</p>",
      ),
    ).toBe("<ul><li>foo <strong>bold</strong> bar</li><li>baz</li></ul>");
  });

  it("tolerates BiDi marks (LRM/RLM) before the bullet character", () => {
    expect(convertPseudoBulletParagraphs("<p>‏- א<br>‏- ב</p>")).toBe(
      "<ul><li>א</li><li>ב</li></ul>",
    );
  });
});
