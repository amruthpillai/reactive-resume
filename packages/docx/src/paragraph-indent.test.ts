// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { Document } from "docx";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { buildDocument } from "./builder";
import { htmlToParagraphs } from "./html-to-docx";

function paragraphXml(html: string) {
	const paragraphs = htmlToParagraphs(html);
	const file = new Document({ sections: [{ children: paragraphs }] });
	return JSON.stringify(
		paragraphs.map((paragraph) => paragraph.prepForXml({ file, viewWrapper: file.Document, stack: [] })),
	);
}

describe("DOCX paragraph indentation (#3397)", () => {
	it.each(["p", "h1", "h2", "h3", "h4", "h5", "h6"])("maps %s indentation to logical-start twips", (tag) => {
		const xml = paragraphXml(`<${tag} data-indent="2">First</${tag}>`);
		expect(xml).toContain('"w:start":720');
	});

	it("keeps unindented and list structure unchanged", () => {
		for (const [plain, marked] of [
			["<p>First</p>", '<p data-indent="0">First</p>'],
			["<ul><li><p>First</p></li></ul>", '<ul><li><p data-indent="2">First</p></li></ul>'],
			["<ol><li>First</li></ol>", '<ol><li data-indent="2">First</li></ol>'],
		] as const)
			expect(paragraphXml(marked)).toBe(paragraphXml(plain));
	});

	it("adds paragraph indentation to the quote inset without flattening paragraphs", () => {
		const html = '<blockquote><p data-indent="1"><strong>First</strong></p><p data-indent="2">Second</p></blockquote>';
		expect(htmlToParagraphs(html)).toHaveLength(2);
		const xml = paragraphXml(html);
		expect(xml).toContain('"w:start":1080');
		expect(xml).toContain('"w:start":1440');
		expect(xml).toContain('"w:b"');
		expect(xml).toContain('"w:i"');
	});

	it("preserves the quote inset on code blocks without indenting ordinary code blocks", () => {
		const quoted = paragraphXml("<blockquote><pre><code>First</code></pre></blockquote>");
		expect(quoted).toContain('"w:start":720');
		expect(quoted).toContain("Courier New");
		expect(paragraphXml("<pre><code>First</code></pre>")).not.toContain('"w:ind"');
	});

	it.each(["ul", "ol"])("adds the quote inset to direct %s list items", (tag) => {
		const xml = paragraphXml(`<blockquote><${tag}><li>First</li></${tag}></blockquote>`);
		expect(xml).toContain('"w:start":1440');
	});

	it.each(["en-US", "he-IL", "ar-SA"])(
		"uses the resume locale for logical indentation in %s DOCX documents",
		(locale) => {
			const data = structuredClone(defaultResumeData);
			data.metadata.page.locale = locale;
			data.metadata.layout.pages = [{ fullWidth: true, main: ["summary"], sidebar: [] }];
			data.summary.content = '<p data-indent="2">IndentProbe</p>';
			const file = buildDocument(data);
			const context = { file, viewWrapper: file.Document, stack: [] };
			const defaults = JSON.stringify(file.Styles.prepForXml(context));
			const document = JSON.stringify(file.Document.View.prepForXml(context));
			expect(document).toContain('"w:start":720');
			if (locale === "en-US") expect(defaults).not.toContain('"w:bidi"');
			else expect(defaults).toContain('"w:bidi"');
		},
	);

	it("characterizes spaces and literal tabs as preserved text, not paragraph indentation", () => {
		const json = paragraphXml("<p>   First</p><p>\tSecond</p>");
		expect(json).toContain("   First");
		expect(json).toContain("\\tSecond");
		expect(json).not.toContain('"w:ind"');
	});
});
