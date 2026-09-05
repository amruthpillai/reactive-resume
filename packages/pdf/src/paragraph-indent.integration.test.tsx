import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createResumePdfFile } from "./server";

const require = createRequire(import.meta.url);
const standardFontDataUrl = `${join(dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts")}/`;

async function readParagraphs(content: string, locale = "en-US") {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics.name = "Jane Doe";
	data.metadata.template = "onyx";
	data.metadata.page.locale = locale;
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.layout.pages = [{ fullWidth: true, main: ["summary"], sidebar: [] }];
	data.summary.content = content;
	let file: File | undefined;
	await act(async () => {
		file = await createResumePdfFile({ data, filename: "indent.pdf" });
	});
	if (!file) throw new Error("PDF generation failed");
	const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()), standardFontDataUrl });
	try {
		const document = await task.promise;
		const page = await document.getPage(1);
		const text = await page.getTextContent();
		return {
			pages: document.numPages,
			items: text.items.flatMap((item) =>
				"str" in item ? [{ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width }] : [],
			),
		};
	} finally {
		await task.destroy();
	}
}

describe("actual PDF paragraph indentation (#3397)", () => {
	it.each(["en-US", "he-IL"])("moves paragraphs and headings from logical start in %s", async (locale) => {
		for (const tag of ["p", "h2"]) {
			// Heading alignment is independently configurable; exercise each logical edge.
			const align = locale === "he-IL" ? "right" : "left";
			const plain = await readParagraphs(`<${tag} style="text-align: ${align};">First</${tag}>`, locale);
			const indented = await readParagraphs(
				`<${tag} data-indent="2" style="text-align: ${align}; margin-inline-start: 48px;">First</${tag}>`,
				locale,
			);
			const baseline = plain.items.find((item) => item.text === "First");
			const moved = indented.items.find((item) => item.text === "First");
			expect(baseline).toBeDefined();
			expect(moved).toBeDefined();
			if (!baseline || !moved) throw new Error("Expected paragraph text in PDF");
			expect(moved.x - baseline.x).toBeCloseTo(locale === "en-US" ? 36 : -36, 2);
			expect(moved.y).toBeCloseTo(baseline.y, 2);
			expect(indented.pages).toBe(plain.pages);
		}
	});

	it.each(["en-US", "he-IL"])("preserves unindented and nested-list output in %s", async (locale) => {
		const plain = "<p>First</p><ul><li><p>Second</p><ol><li>Third</li></ol></li></ul>";
		const marked =
			'<p data-indent="0">First</p><ul><li><p data-indent="2" style="margin-inline-start: 48px;">Second</p><ol><li>Third</li></ol></li></ul>';
		expect(await readParagraphs(marked, locale)).toEqual(await readParagraphs(plain, locale));
	});

	it("moves every wrapped line, not only the first line", async () => {
		const content = "Wrapped paragraph text stays within its own block. ".repeat(18);
		const plain = await readParagraphs(`<p>${content}</p>`);
		const indented = await readParagraphs(`<p data-indent="2">${content}</p>`);
		const baseline = plain.items.find((item) => item.text.includes("Wrapped"));
		const lines = indented.items.filter((item) => item.text.includes("Wrapped"));
		if (!baseline) throw new Error("Expected paragraph text in PDF");
		expect(lines.length).toBeGreaterThan(1);
		for (const line of lines) expect(line.x - baseline.x).toBeCloseTo(36, 2);
	});

	it("ignores paragraph offsets in RTL list descendants with pseudo-bullets", async () => {
		const plain = "<ul><li><p>- First<br>- Second</p><p>Third</p></li></ul>";
		const marked = '<ul><li><p data-indent="2">- First<br>- Second</p><p>Third</p></li></ul>';
		expect(await readParagraphs(marked, "he-IL")).toEqual(await readParagraphs(plain, "he-IL"));
	});

	it("characterizes leading spaces and tabs as collapsed by PDF HTML rendering", async () => {
		expect(await readParagraphs("<p>   First</p><p>\tSecond</p>")).toEqual(
			await readParagraphs("<p>First</p><p>Second</p>"),
		);
	});

	it("indents every line of RTL pseudo-bullet paragraphs", async () => {
		const plain = await readParagraphs("<p>- First<br>- Second</p>", "he-IL");
		const indented = await readParagraphs('<p data-indent="2">- First<br>- Second</p>', "he-IL");
		for (const text of ["First", "Second"]) {
			const baseline = plain.items.find((item) => item.text.includes(text));
			const moved = indented.items.find((item) => item.text.includes(text));
			if (!baseline || !moved) throw new Error(`Expected ${text} in PDF`);
			expect(moved.x - baseline.x).toBeCloseTo(-36, 2);
			expect(moved.y).toBeCloseTo(baseline.y, 2);
		}
	});
});
