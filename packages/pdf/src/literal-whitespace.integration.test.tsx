import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createResumePdfFile } from "./server";

const require = createRequire(import.meta.url);
const standardFontDataUrl = `${join(dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts")}/`;
const preserve = 'data-resume-whitespace="preserve"';

type TextItem = {
	text: string;
	x: number;
	y: number;
	width: number;
};

async function renderItems(content: string, locale = "en-US", narrow = false): Promise<TextItem[]> {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics.name = "";
	data.metadata.template = narrow ? "chikorita" : "onyx";
	data.metadata.page.locale = locale;
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.layout.pages = [
		narrow ? { fullWidth: false, main: [], sidebar: ["summary"] } : { fullWidth: true, main: ["summary"], sidebar: [] },
	];
	if (narrow) data.metadata.layout.sidebarWidth = 25;
	data.summary.content = content;

	let file: File | undefined;
	await act(async () => {
		file = await createResumePdfFile({ data, filename: "literal-whitespace.pdf" });
	});
	if (!file) throw new Error("PDF generation failed");
	const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()), standardFontDataUrl });
	try {
		const document = await task.promise;
		const items: TextItem[] = [];
		for (let pageIndex = 0; pageIndex < document.numPages; pageIndex++) {
			const page = await document.getPage(pageIndex + 1);
			const text = await page.getTextContent();
			for (const item of text.items) {
				if ("str" in item)
					items.push({ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width });
			}
		}
		return items;
	} finally {
		await task.destroy();
	}
}

function lineMetrics(items: TextItem[]) {
	const anchor = items.find((item) => item.text.includes("LIT"));
	if (!anchor) throw new Error(`Expected LIT anchor in: ${items.map((item) => item.text).join("|")}`);
	const line = items.filter((item) => Math.abs(item.y - anchor.y) < 0.01);
	const start = Math.min(...line.map((item) => item.x));
	const end = Math.max(...line.map((item) => item.x + item.width));
	return { start, width: end - start, text: line.map((item) => item.text).join("") };
}

async function line(content: string, locale = "en-US") {
	return lineMetrics(await renderItems(content, locale));
}

describe("actual PDF literal whitespace (#3397)", () => {
	it.each(["en-US", "he-IL", "ar-SA"])(
		"advances first content for marked leading spaces and tabs in %s",
		async (locale) => {
			const rtl = locale !== "en-US";
			const firstContent = async (prefix: string, marked = true) => {
				const items = await renderItems(
					`<p ${marked ? preserve : ""}>${prefix}<strong>LIT</strong> AB END</p>`,
					locale,
				);
				const anchor = items.find((item) => item.text.includes("LIT"));
				if (!anchor) throw new Error("Missing first-content anchor");
				expect(
					items
						.filter((item) => Math.abs(item.y - anchor.y) < 0.01)
						.map((item) => item.text)
						.join("")
						.replace(/\s/g, ""),
				).toBe("LITABEND");
				return rtl ? anchor.x + anchor.width : anchor.x;
			};
			const compact = await firstContent("");
			const spaces = await firstContent("  ");
			const tab = await firstContent("\t");
			const sign = rtl ? -1 : 1;
			// Helvetica body is 10pt, with an ordinary-space advance of 2.78pt.
			expect(sign * (spaces - compact)).toBeCloseTo(5.56, 2);
			expect(sign * (tab - compact)).toBeCloseTo(11.12, 2);
			expect(await firstContent("  ", false)).toBeCloseTo(await firstContent("", false), 2);
		},
	);

	it("keeps literal layout local to marked siblings in the same PDF", async () => {
		const items = await renderItems(`<p ${preserve}>\tLIT AB END</p><p>  LIT AB END</p><p>LIT AB END</p>`);
		const anchors = items.filter((item) => item.text.includes("LIT"));
		expect(anchors).toHaveLength(3);
		const [marked, legacy, compact] = anchors;
		if (!marked || !legacy || !compact) throw new Error("Missing mixed-block anchors");
		expect(marked.x - legacy.x).toBeCloseTo(11.12, 2);
		expect(legacy.x).toBeCloseTo(compact.x, 2);
		for (const anchor of anchors) {
			expect(
				items
					.filter((item) => Math.abs(item.y - anchor.y) < 0.01)
					.map((item) => item.text)
					.join("")
					.replace(/\s/g, ""),
			).toBe("LITABEND");
		}
	});

	it("renders one tab as exactly four ordinary-space advances", async () => {
		const compact = await line(`<p ${preserve}>LIT AB END</p>`);
		const oneSpace = await line(`<p ${preserve}>LIT A B END</p>`);
		const fourSpaces = await line(`<p ${preserve}>LIT A    B END</p>`);
		const tab = await line(`<p ${preserve}>LIT A\tB END</p>`);
		const spaceAdvance = oneSpace.width - compact.width;

		expect(spaceAdvance).toBeGreaterThan(0);
		expect(fourSpaces.width - compact.width).toBeCloseTo(spaceAdvance * 4, 2);
		expect(tab.width).toBeCloseTo(fourSpaces.width, 2);
	});

	it("renders two tabs as eight spaces independent of current x", async () => {
		const twoTabs = await line(`<p ${preserve}>LIT A\t\tB END</p>`);
		const eightSpaces = await line(`<p ${preserve}>LIT A        B END</p>`);
		const oneLetter = await line(`<p ${preserve}>LIT A\tB END</p>`);
		const oneLetterCompact = await line(`<p ${preserve}>LIT AB END</p>`);
		const threeLetters = await line(`<p ${preserve}>LIT ABC\tD END</p>`);
		const threeLettersCompact = await line(`<p ${preserve}>LIT ABCD END</p>`);

		expect(twoTabs.width).toBeCloseTo(eightSpaces.width, 2);
		expect(oneLetter.width - oneLetterCompact.width).toBeCloseTo(threeLetters.width - threeLettersCompact.width, 2);
	});

	it.each(["en-US", "he-IL", "ar-SA"])("keeps marked tab geometry in %s", async (locale) => {
		const tab = await line(`<p ${preserve}>LIT A\tB END</p>`, locale);
		const spaces = await line(`<p ${preserve}>LIT A    B END</p>`, locale);
		expect(tab.width).toBeCloseTo(spaces.width, 2);
	});

	it("keeps unmarked collapse node-local and marked narrow content complete", async () => {
		const unmarked = await line("<p>LIT A    B END</p>");
		const collapsed = await line("<p>LIT A B END</p>");
		expect(unmarked).toEqual(collapsed);

		const sample = "LIT    START\tSome breakable words continue through narrow content without disappearing END";
		const items = await renderItems(`<p ${preserve}>${sample}</p>`, "en-US", true);
		const text = items
			.map((item) => item.text)
			.join("")
			.replace(/\s/g, "");
		expect(text.slice(text.indexOf("LIT"))).toBe(sample.replace(/\s/g, ""));
	});

	it.each([
		[
			"list",
			'<ul><li><p data-resume-whitespace="preserve">LIT A\tB END</p></li></ul>',
			'<ul><li><p data-resume-whitespace="preserve">LIT A    B END</p></li></ul>',
		],
		[
			"quote",
			'<blockquote><p data-resume-whitespace="preserve">LIT A\tB END</p></blockquote>',
			'<blockquote><p data-resume-whitespace="preserve">LIT A    B END</p></blockquote>',
		],
		[
			"table cell",
			'<table><tbody><tr><td><p data-resume-whitespace="preserve">LIT A\tB END</p></td></tr></tbody></table>',
			'<table><tbody><tr><td><p data-resume-whitespace="preserve">LIT A    B END</p></td></tr></tbody></table>',
		],
	] as const)("preserves marked tab geometry in a %s", async (_name, tabHtml, spacesHtml) => {
		const tab = await line(tabHtml);
		const spaces = await line(spacesHtml);
		expect(tab.width).toBeCloseTo(spaces.width, 2);
	});
});
