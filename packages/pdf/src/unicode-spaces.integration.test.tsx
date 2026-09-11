import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act, createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "./document";

type Line = { text: string; x: number; y: number; right: number };

function resume(plain: string, html: string, family = "Noto Serif SC", locale = "zh-CN"): ResumeData {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics.name = "Probe";
	data.basics.headline = plain;
	data.metadata.page.locale = locale;
	data.metadata.typography.body.fontFamily = family;
	data.metadata.typography.heading.fontFamily = family;
	data.metadata.typography.body.fontSize = 10;
	data.metadata.typography.body.fontWeights = ["400", "700"];
	data.metadata.typography.heading.fontWeights = ["400", "700"];
	data.metadata.layout.pages = [{ fullWidth: true, main: ["summary"], sidebar: [] }];
	data.summary.title = "Whitespace";
	data.summary.hidden = false;
	data.summary.content = html;
	return data;
}

async function pdfLines(data: ResumeData) {
	const element = createElement(ResumeDocument, { data, template: "onyx" }) as unknown as Parameters<
		typeof renderToBuffer
	>[0];
	const loading = getDocument({ data: new Uint8Array(await act(() => renderToBuffer(element))) });
	try {
		const document = await loading.promise;
		expect(document.numPages).toBe(1);
		const page = await document.getPage(1);
		const content = await page.getTextContent({ disableNormalization: true });
		const lines = new Map<number, Line>();
		for (const item of content.items) {
			if (!("str" in item) || !item.str) continue;
			const x = item.transform[4];
			const y = item.transform[5];
			const line = lines.get(y) ?? { text: "", x, y, right: x };
			line.text += item.str;
			line.x = Math.min(line.x, x);
			line.right = Math.max(line.right, x + item.width);
			lines.set(y, line);
		}
		const ordered = [...lines.values()].sort((a, b) => b.y - a.y);
		const title = ordered.find((line) => line.text === "Whitespace");
		if (!title) throw new Error("Missing summary title in PDF");
		const plain = ordered[1];
		if (!plain) throw new Error("Missing plain headline control in PDF");
		return { plain, body: ordered.filter((line) => line.y < title.y) };
	} finally {
		await loading.destroy();
	}
}

function width(line: Line | undefined) {
	if (!line) throw new Error("Missing expected PDF text line");
	return line.right - line.x;
}

describe("Unicode spaces in exported rich text", () => {
	it.each([
		["Noto Serif SC", "zh-CN"],
		["Noto Serif SC", "en-US"],
		["Noto Sans SC", "zh-CN"],
		["IBM Plex Serif", "zh-CN"],
		["Noto Serif SC", "ar-SA"],
	])("retains ideographic-space advances with %s / %s", { timeout: 60_000 }, async (family, locale) => {
		const { plain, body } = await pdfLines(resume("中\u3000文\u3000字", "<p>中\u3000文\u3000字</p>", family, locale));
		expect(body).toHaveLength(1);
		// Three full-width glyphs plus two ideographic spaces at 10pt.
		expect(width(plain)).toBeCloseTo(50, 2);
		expect(width(body[0])).toBeCloseTo(50, 2);
	});

	it.each([
		["mixed Latin/CJK", "中\u3000A\u3000\u3000文", "<p>中\u3000A\u3000\u3000文</p>"],
		["inline leading spaces", "中\u3000\u3000文", "<p>中<span>\u3000\u3000文</span></p>"],
		["marked spaces", "中\u3000\u3000文", "<p>中<em>\u3000\u3000</em>文</p>"],
		["literal nonbreaking spaces", "中\u00a0\u00a0文", "<p>中\u00a0\u00a0文</p>"],
		["named nonbreaking-space count", "中\u00a0\u00a0文", "<p>中&nbsp;&nbsp;文</p>"],
		["ordinary ASCII whitespace", "中 文", "<p>中 \t\n\r\f  文</p>"],
		["preformatted spaces", "中\u3000\u3000文", '<pre style="font-size: 10pt">中\u3000\u3000文</pre>'],
	])("preserves %s", { timeout: 60_000 }, async (_name, text, html) => {
		const { plain, body } = await pdfLines(resume(text, html));
		expect(body).toHaveLength(1);
		expect(body[0]?.text.replaceAll(/\s/g, "")).toBe(text.replaceAll(/\s/g, ""));
		expect(width(body[0])).toBeCloseTo(width(plain), 2);
	});

	it("retains ideographic spaces at the start of a paragraph", { timeout: 60_000 }, async () => {
		const { plain, body } = await pdfLines(resume("中 文", "<p>\u3000中 文</p>"));
		expect(body).toHaveLength(1);
		expect(body[0]?.right).toBeCloseTo(plain.right + 10, 2);
	});

	it("retains ideographic spaces at the start of bare rich text", { timeout: 60_000 }, async () => {
		const { plain, body } = await pdfLines(resume("中 文", "\u3000中 文"));
		expect(body).toHaveLength(1);
		expect(body[0]?.right).toBeCloseTo(plain.right + 10, 2);
	});

	it("keeps repeated ASCII spaces and line breaks in preformatted text", { timeout: 60_000 }, async () => {
		const { plain, body } = await pdfLines(resume("A  B", '<pre style="font-size: 10pt">A  B\nA  B</pre>'));
		expect(body).toHaveLength(2);
		for (const line of body) expect(width(line)).toBeCloseTo(width(plain), 2);
	});

	it("retains a literal nonbreaking space's word grouping", { timeout: 60_000 }, async () => {
		const data = resume("a hello world", "<p>a hello\u00a0world</p>", "Helvetica", "en-US");
		data.metadata.stylesheet = {
			mode: "semantic",
			source: { languageVersion: 1, text: "@version 1; section { width: 50pt; }" },
		};
		const ascii = await pdfLines({ ...data, summary: { ...data.summary, content: "<p>a hello world</p>" } });
		expect(ascii.body.map((line) => line.text.trim())).toEqual(["a hello", "world"]);
		const { body } = await pdfLines(data);
		expect(body.map((line) => line.text.trim().replaceAll("\u00a0", " "))).toEqual(["a", "hello world"]);
	});
});
