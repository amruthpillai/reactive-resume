// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { Document } from "docx";
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

	it("keeps unindented, list, and blockquote structure unchanged", () => {
		for (const [plain, marked] of [
			["<p>First</p>", '<p data-indent="0">First</p>'],
			["<ul><li><p>First</p></li></ul>", '<ul><li><p data-indent="2">First</p></li></ul>'],
			["<ol><li>First</li></ol>", '<ol><li data-indent="2">First</li></ol>'],
			["<blockquote><p>First</p></blockquote>", '<blockquote><p data-indent="2">First</p></blockquote>'],
		] as const)
			expect(paragraphXml(marked)).toBe(paragraphXml(plain));
	});

	it("characterizes spaces and literal tabs as preserved text, not paragraph indentation", () => {
		const json = paragraphXml("<p>   First</p><p>\tSecond</p>");
		expect(json).toContain("   First");
		expect(json).toContain("\\tSecond");
		expect(json).not.toContain('"w:ind"');
	});
});
