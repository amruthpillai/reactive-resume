import { describe, expect, it } from "vitest";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act } from "react";
import { getWebFontSource } from "@reactive-resume/fonts";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "./document";

async function fontForProbe(alias: string, family = "Noto Serif SC") {
	const src = getWebFontSource(family, "400", false);
	if (!src) throw new Error(`Missing test font: ${family}`);
	Font.register({ family: alias, src });
	await Font.load({ fontFamily: alias });
	const font = Font.getFont({ fontFamily: alias }).data;
	if (!font) throw new Error("Font did not load");
	return font;
}

describe("cached font glyph character identity", () => {
	it.each(["\u200c", "\u200d"])(
		"keeps invisible %j and visible missing glyphs distinct in both orders",
		{ timeout: 60_000 },
		async (joiner) => {
			const font = await fontForProbe(`Joiner ${joiner.codePointAt(0)}`);
			// React PDF's attachment pass can be the first lookup of .notdef.
			font.glyphForCodePoint(0xfffc);
			const missing = "\u{1f984}";
			expect(font.hasGlyphForCodePoint(0x1f984)).toBe(false);
			for (const text of [joiner + missing, missing + joiner]) {
				const run = font.layout(text);
				expect(run.glyphs).toHaveLength(2);
				const missingIndex = text.startsWith(missing) ? 0 : 1;
				expect(run.positions[missingIndex]?.xAdvance).toBeGreaterThan(0);
				expect(run.positions[1 - missingIndex]?.xAdvance).toBe(0);
				expect(run.glyphs[missingIndex]?.codePoints).toEqual([0x1f984]);
			}
		},
	);

	it("retains each spelling when a ligature and its Unicode character share an outline", {
		timeout: 60_000,
	}, async () => {
		const font = await fontForProbe("Ligature identity", "IBM Plex Serif");
		const letters = font.layout("fi");
		const character = font.layout("\ufb01");
		expect(letters.glyphs).toHaveLength(1);
		expect(character.glyphs).toHaveLength(1);
		expect(letters.glyphs[0]?.id).toBe(character.glyphs[0]?.id);
		expect(letters.glyphs[0]?.codePoints).toEqual([0x66, 0x69]);
		expect(character.glyphs[0]?.codePoints).toEqual([0xfb01]);
		expect(letters.glyphs[0]?.isLigature).toBe(true);
		expect(character.glyphs[0]?.isLigature).toBe(false);
		expect(character.advanceWidth).toBe(letters.advanceWidth);
	});

	it("retains mark metadata when unsupported marks and symbols share .notdef", { timeout: 60_000 }, async () => {
		const font = await fontForProbe("Mark identity");
		expect(font.hasGlyphForCodePoint(0x1ab0)).toBe(false);
		const symbol = font.glyphForCodePoint(0x1f984);
		const mark = font.glyphForCodePoint(0x1ab0);
		expect(mark.id).toBe(symbol.id);
		expect(symbol.isMark).toBe(false);
		expect(mark.isMark).toBe(true);
		expect(mark.path.toSVG()).toBe(symbol.path.toSVG());
		expect(mark.bbox).toEqual(symbol.bbox);
	});

	it("does not retain character aliases in the glyph cache", { timeout: 60_000 }, async () => {
		const font = await fontForProbe("Alias cache size");
		const cached = font.glyphForCodePoint(0x1f984);
		const glyphCache: unknown = Reflect.get(font, "_glyphs");
		if (!glyphCache || typeof glyphCache !== "object") throw new Error("Missing font glyph cache");
		const initialSize = Object.keys(glyphCache).length;
		const codePoints = Array.from({ length: 1_000 }, (_, index) => 0xf0000 + index);
		expect(codePoints.every((codePoint) => !font.hasGlyphForCodePoint(codePoint))).toBe(true);

		const aliases = codePoints.map((codePoint) => font.glyphForCodePoint(codePoint));
		expect(aliases.every((alias) => alias.id === cached.id && alias !== cached)).toBe(true);
		expect(Object.keys(glyphCache)).toHaveLength(initialSize);
		expect(font.glyphForCodePoint(0x1f984)).toBe(cached);
	});

	it("keeps CJK spaces unchanged after a Unicode-only PDF export", { timeout: 60_000 }, async () => {
		const data = structuredClone(defaultResumeData);
		data.picture.hidden = true;
		data.basics.name = "Probe";
		data.metadata.page.locale = "zh-CN";
		data.metadata.typography.body.fontFamily = "Noto Serif SC";
		data.metadata.typography.heading.fontFamily = "Noto Serif SC";
		data.metadata.typography.body.fontSize = 10;
		data.metadata.layout.pages = [{ fullWidth: true, main: ["summary"], sidebar: [] }];
		data.summary.title = "Text";
		data.summary.content = '<pre style="font-size: 10pt">中\u3000文</pre>';
		await act(() => renderToBuffer(<ResumeDocument data={data} template="onyx" />));
		data.summary.content = "<p>中 文 字</p>";
		for (let attempt = 0; attempt < 2; attempt++) {
			const bytes = await act(() => renderToBuffer(<ResumeDocument data={data} template="onyx" />));
			const loading = getDocument({ data: new Uint8Array(bytes) });
			try {
				const document = await loading.promise;
				const page = await document.getPage(1);
				const items = (await page.getTextContent()).items.filter((item) => "str" in item);
				const body = items.filter((item) => item.str.includes("中"));
				expect(body).toHaveLength(1);
				expect(body[0]?.str).toBe("中 文 字");
				// Three 10pt Chinese glyphs and two 2.56pt ordinary spaces.
				expect(body[0]?.width).toBeCloseTo(35.12, 2);
			} finally {
				await loading.destroy();
			}
		}
	});
});
