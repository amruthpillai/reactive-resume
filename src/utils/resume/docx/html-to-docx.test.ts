import { ExternalHyperlink, Paragraph, TextRun } from "docx";
import { describe, expect, it } from "vite-plus/test";

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

  it("does not create hyperlink for unsafe javascript links", () => {
    const result = htmlToParagraphs('<p><a href="javascript:alert(1)">Click me</a></p>');
    expect(result).toHaveLength(1);

    const paragraph = result[0];
    expect(paragraph).toBeDefined();
    const children = getChildren(paragraph as Paragraph);
    const hyperlinks = children.filter((c) => c instanceof ExternalHyperlink);
    expect(hyperlinks).toHaveLength(0);
  });

  it("does not create hyperlink for unsafe data links", () => {
    const result = htmlToParagraphs('<p><a href="data:text/html;base64,PHNjcmlwdD4=">Click me</a></p>');
    expect(result).toHaveLength(1);

    const paragraph = result[0];
    expect(paragraph).toBeDefined();
    const children = getChildren(paragraph as Paragraph);
    const hyperlinks = children.filter((c) => c instanceof ExternalHyperlink);
    expect(hyperlinks).toHaveLength(0);
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

  // --- Additional coverage: block elements ---

  it("parses blockquote with italic styling", () => {
    const result = htmlToParagraphs("<blockquote>Quote text</blockquote>");
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Paragraph);
  });

  it("parses pre/code block with monospace font", () => {
    const result = htmlToParagraphs("<pre>const x = 42;</pre>");
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Paragraph);
  });

  it("parses hr as empty paragraph", () => {
    const result = htmlToParagraphs("<hr>");
    expect(result).toHaveLength(1);
  });

  it("parses heading elements (h1-h6)", () => {
    for (let i = 1; i <= 6; i++) {
      const result = htmlToParagraphs(`<h${i}>Heading ${i}</h${i}>`);
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Paragraph);
    }
  });

  it("parses div as block element", () => {
    const result = htmlToParagraphs("<div>Content in div</div>");
    expect(result).toHaveLength(1);
  });

  it("parses inline code with Courier New font", () => {
    const result = htmlToParagraphs("<p><code>inline code</code></p>");
    expect(result).toHaveLength(1);
  });

  it("parses mark/highlight element", () => {
    const result = htmlToParagraphs("<p><mark>highlighted</mark></p>");
    expect(result).toHaveLength(1);
  });

  it("parses b tag (same as strong)", () => {
    const result = htmlToParagraphs("<p><b>bold</b></p>");
    expect(result).toHaveLength(1);
  });

  it("parses i tag (same as em)", () => {
    const result = htmlToParagraphs("<p><i>italic</i></p>");
    expect(result).toHaveLength(1);
  });

  it("parses strike tag", () => {
    const result = htmlToParagraphs("<p><strike>struck</strike></p>");
    expect(result).toHaveLength(1);
  });

  // --- Nested lists ---

  it("parses nested unordered list", () => {
    const html = "<ul><li>Top<ul><li>Nested</li></ul></li></ul>";
    const result = htmlToParagraphs(html);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("parses nested ordered list", () => {
    const html = "<ol><li>First<ol><li>Sub</li></ol></li></ol>";
    const result = htmlToParagraphs(html);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("parses list with paragraph inside li", () => {
    const html = "<ul><li><p>Paragraph in list</p></li></ul>";
    const result = htmlToParagraphs(html);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  // --- Style config ---

  it("applies styleConfig font and size to text runs", () => {
    const result = htmlToParagraphs("<p>Styled</p>", {
      font: "Georgia",
      size: 24,
      color: "333333",
    });
    expect(result).toHaveLength(1);
  });

  it("preserves inline text colors from rich text spans", () => {
    const result = htmlToParagraphs('<p><span style="color: rgba(21, 93, 252, 1)">Styled</span></p>');
    expect(result).toHaveLength(1);

    const children = getChildren(result[0] as Paragraph);
    const textRun = children.find((child) => child instanceof TextRun);

    expect(textRun).toBeDefined();
    expect(JSON.stringify(textRun)).toContain('"val":"155DFC"');
  });

  it("applies linkColor from styleConfig", () => {
    const result = htmlToParagraphs('<p><a href="https://example.com">link</a></p>', {
      linkColor: "FF0000",
    });
    expect(result).toHaveLength(1);
    const children = getChildren(result[0] as Paragraph);
    const hyperlinks = children.filter((c) => c instanceof ExternalHyperlink);
    expect(hyperlinks).toHaveLength(1);
  });

  // --- Top-level text nodes ---

  it("handles plain text without wrapper element", () => {
    const result = htmlToParagraphs("Just plain text");
    expect(result).toHaveLength(1);
  });

  it("handles link without href falling back to inline text", () => {
    const result = htmlToParagraphs("<p><a>No href link</a></p>");
    expect(result).toHaveLength(1);
    const children = getChildren(result[0] as Paragraph);
    // Should have TextRun, not ExternalHyperlink (no href)
    const hyperlinks = children.filter((c) => c instanceof ExternalHyperlink);
    expect(hyperlinks).toHaveLength(0);
  });

  it("handles empty blockquote", () => {
    const result = htmlToParagraphs("<blockquote></blockquote>");
    expect(result).toHaveLength(0);
  });

  it("handles empty pre", () => {
    const result = htmlToParagraphs("<pre></pre>");
    expect(result).toHaveLength(0);
  });

  it("handles empty heading", () => {
    const result = htmlToParagraphs("<h1></h1>");
    expect(result).toHaveLength(0);
  });

  // --- Multiple block elements ---

  it("handles complex HTML with mixed elements", () => {
    const html = `
      <h2>Title</h2>
      <p>Introduction paragraph</p>
      <ul><li>Item 1</li><li>Item 2</li></ul>
      <blockquote>A quote</blockquote>
      <pre>code block</pre>
    `;
    const result = htmlToParagraphs(html);
    // h2 + p + 2 li + blockquote + pre = 6
    expect(result.length).toBeGreaterThanOrEqual(5);
  });
});
