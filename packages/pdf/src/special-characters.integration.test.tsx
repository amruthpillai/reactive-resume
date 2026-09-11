import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it } from "vitest";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createResumePdfFile } from "./server";

type PdfGlyph = {
	unicode: string;
	width: number;
	isInFont: boolean;
};

const fixture = (): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics.name = "Jane Doe";
	data.metadata.template = "ditgar";
	data.metadata.layout.pages = [{ fullWidth: true, main: ["summary"], sidebar: [] }];
	data.summary.hidden = false;
	return data;
};

// Inspect the generated PDF, not just Font.register calls: a missing glyph can
// fall through to a standard font and become a different, overlapping character.
async function readPdf(data: ResumeData) {
	const file = await createResumePdfFile({ data, filename: "resume.pdf" });
	const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
	try {
		const document = await task.promise;
		const glyphs: PdfGlyph[] = [];
		let text = "";
		for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
			const page = await document.getPage(pageNumber);
			const content = await page.getTextContent({ disableNormalization: true });
			text += content.items.map((item) => ("str" in item ? item.str : "")).join("");
			const operators = await page.getOperatorList();
			for (let index = 0; index < operators.fnArray.length; index++) {
				if (operators.fnArray[index] !== OPS.showText) continue;
				const run = operators.argsArray[index][0] as (PdfGlyph | number)[];
				glyphs.push(...run.filter((glyph): glyph is PdfGlyph => typeof glyph !== "number"));
			}
		}
		return { text, glyphs };
	} finally {
		await task.destroy();
	}
}

describe("special characters in exported PDFs (#3106)", () => {
	it("embeds non-breaking hyphens in plain and rich text without corrupting adjacent letters", {
		timeout: 30_000,
	}, async () => {
		const data = fixture();
		data.metadata.typography.body.fontFamily = "IBM Plex Serif";
		data.metadata.typography.body.fontWeights = ["400", "600"];
		data.metadata.typography.heading.fontFamily = "IBM Plex Serif";
		data.metadata.typography.heading.fontWeights = ["600"];
		data.basics.headline = "Data‑Driven Decision Making";
		data.summary.content = "<p>AI‑driven hands‑on go‑to‑market non‑SaaS e‑mobility</p>";

		const { text, glyphs } = await readPdf(data);
		expect(text).toContain(data.basics.headline);
		expect(text).toContain("AI‑driven hands‑on go‑to‑market non‑SaaS e‑mobility");
		const hyphens = glyphs.filter((glyph) => glyph.unicode === "‑");
		expect(hyphens).toHaveLength(7);
		for (const glyph of hyphens) {
			expect(glyph.isInFont).toBe(true);
			expect(glyph.width).toBeGreaterThan(0);
		}
	});

	it("embeds the technologist emoji sequence in headings and rich text as one glyph", { timeout: 30_000 }, async () => {
		const data = fixture();
		data.metadata.typography.body.fontFamily = "Source Sans 3";
		data.metadata.typography.body.fontWeights = ["400", "600"];
		data.metadata.typography.heading.fontFamily = "JetBrains Mono";
		data.metadata.typography.heading.fontWeights = ["500", "700"];
		data.basics.name = "John Doe 👨‍💻";
		data.summary.content = "<p>Engineer 👨‍💻</p>";

		const { text, glyphs } = await readPdf(data);
		expect(text).toContain(data.basics.name);
		expect(text).toContain("Engineer 👨‍💻");
		const emoji = glyphs.filter((glyph) => glyph.unicode === "👨‍💻");
		expect(emoji).toHaveLength(2);
		for (const glyph of emoji) {
			expect(glyph.isInFont).toBe(true);
			expect(glyph.width).toBeGreaterThan(0);
		}
	});
});
