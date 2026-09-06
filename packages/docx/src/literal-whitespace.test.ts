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

describe("DOCX literal whitespace (#3397)", () => {
	it.each(["p", "h2"])("emits exact marked %s spaces with XML preservation", (tag) => {
		const xml = paragraphXml(`<${tag} data-resume-whitespace="preserve">  Lead  middle end  </${tag}>`);
		expect(xml).toContain("  Lead  middle end  ");
		expect(xml).toContain('"xml:space":"preserve"');
	});

	it("expands marked tabs to four ordinary spaces while leaving unmarked legacy tabs unchanged", () => {
		const marked = paragraphXml('<p data-resume-whitespace="preserve">A\tB\t\tC</p>');
		expect(marked).toContain("A    B        C");
		expect(marked).not.toContain("\\t");
		expect(marked).toContain('"xml:space":"preserve"');

		const legacy = paragraphXml("<p>A\tB</p>");
		expect(legacy).toContain("A\\tB");
	});

	it("preserves marked tabs through marks, line breaks, lists, quotes, and table cells", () => {
		const html = [
			'<p data-resume-whitespace="preserve"><strong>  Bold</strong><br>\tNext</p>',
			'<blockquote><p data-resume-whitespace="preserve">\tQuoted</p></blockquote>',
			'<ul><li><p data-resume-whitespace="preserve">\tListed</p></li></ul>',
			'<table><tbody><tr><td><p data-resume-whitespace="preserve">\tCell</p></td></tr></tbody></table>',
		].join("");
		const xml = paragraphXml(html);
		expect(xml).toContain("  Bold");
		expect(xml).toContain("    Next");
		expect(xml).toContain("    Quoted");
		expect(xml).toContain("    Listed");
		expect(xml).toContain("    Cell");
		expect(xml).not.toContain("\\t");
		expect(xml).toContain('"w:b"');
		expect(xml).toContain('"w:br"');
	});
});
