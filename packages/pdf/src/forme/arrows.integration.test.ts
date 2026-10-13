import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, it } from "vitest";
import * as forme from "@formepdf/core";
import * as worker from "@formepdf/core/worker";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createFontPreparer, createFontSubsetter } from "./font-subset";
import { assertPdfText, renderResume } from "./render";

const require = createRequire(import.meta.url);

const cases = [
	["Times-Roman", "server"],
	["Times-Roman", "worker"],
	["Baskervville", "server"],
	["Baskervville", "worker"],
] as const;

const fixture = (font: string) => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.metadata.template = "onyx";
	data.metadata.typography.body.fontFamily = font;
	data.metadata.typography.heading.fontFamily = font;
	data.metadata.layout.pages = [{ fullWidth: true, main: ["summary"], sidebar: [] }];
	data.summary.hidden = false;
	data.summary.content = "<p>Hours → Minutes; <strong>Hours → Minutes</strong>; <em>Hours → Minutes</em></p>";
	return data;
};

it.each(cases)("preserves arrows with %s in the %s engine", { timeout: 60_000 }, async (font, engineName) => {
	const data = fixture(font);
	let engine: Parameters<typeof renderResume>[0] = {
		renderSerializedDocWithLayout: forme.renderSerializedDocWithLayout,
	};
	if (engineName === "worker") {
		await worker.init(readFileSync(require.resolve("@formepdf/core/pkg-web/forme_bg.wasm")));
		const subset = await createFontSubsetter(readFileSync(require.resolve("harfbuzzjs/dist/harfbuzz-subset.wasm")));
		engine = { ...worker, prepareFont: createFontPreparer(subset) };
	}
	const result = await act(() => renderResume(engine, { data }));
	expect(result.missingFonts, result.warnings.join("\n")).toEqual([]);
	expect(() => assertPdfText(result), result.warnings.join("\n")).not.toThrow();
	const task = getDocument({ data: result.pdf });
	try {
		const document = await task.promise;
		const page = await document.getPage(1);
		const text = await page.getTextContent();
		const extracted = text.items.map((item) => ("str" in item ? item.str : "")).join(" ");
		expect(extracted.replace(/\s+/g, " ")).toContain("Hours → Minutes");
		const operators = await page.getOperatorList();
		const arrows: { unicode: string; width: number; isInFont: boolean }[] = [];
		operators.fnArray.forEach((operation, index) => {
			if (operation === OPS.showText) {
				arrows.push(...operators.argsArray[index][0].filter((glyph: { unicode?: string }) => glyph?.unicode === "→"));
			}
		});
		expect(arrows).toHaveLength(3);
		for (const arrow of arrows) {
			expect(arrow.isInFont).toBe(true);
			expect(arrow.width).toBeGreaterThan(0);
		}
	} finally {
		await task.destroy();
	}
});
