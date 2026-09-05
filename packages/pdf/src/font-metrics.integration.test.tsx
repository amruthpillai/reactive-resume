import { describe, expect, it } from "vitest";
import { Document, Font, Page, renderToBuffer, Text } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act } from "react";
import { getWebFontSource } from "@reactive-resume/fonts";

async function baselines(families: string[], content = "Heading", lineHeight = 1.5) {
	for (const family of families) {
		const src = getWebFontSource(family, "400", false);
		if (!src) throw new Error(`Missing test font: ${family}`);
		Font.register({ family, src });
	}
	const bytes = await act(() =>
		renderToBuffer(
			<Document>
				<Page size="A4">
					{families.map((family, index) => (
						<Text
							key={family}
							style={{
								position: "absolute",
								top: 20 + index * 100,
								left: 20,
								fontFamily: family,
								fontSize: 20,
								lineHeight,
							}}
						>
							{content}
						</Text>
					))}
				</Page>
			</Document>,
		),
	);
	const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
	try {
		const doc = await task.promise;
		expect(doc.numPages).toBe(1);
		const page = await doc.getPage(1);
		const text = await page.getTextContent();
		return text.items.flatMap((item) =>
			"str" in item && item.str
				? [{ text: item.str, y: page.getViewport({ scale: 1 }).height - Number(item.transform[5]) }]
				: [],
		);
	} finally {
		await task.destroy();
	}
}

function baselineAt(rows: { y: number }[], index: number) {
	const row = rows[index];
	if (!row) throw new Error(`Missing PDF text row ${index}`);
	return row.y;
}

describe("font baselines in generated PDFs (#3249)", () => {
	it.each(["Roboto", "Roboto Condensed"])(
		"aligns %s with Roboto Flex's matching vertical metrics",
		{ timeout: 30_000 },
		async (family) => {
			const rows = await baselines([family, "Roboto Flex"]);
			expect(rows).toHaveLength(2);
			expect(baselineAt(rows, 0) - 20).toBeCloseTo(baselineAt(rows, 1) - 120, 3);
		},
	);
	it("aligns IBM Plex Sans Condensed with IBM Plex Sans", { timeout: 30_000 }, async () => {
		const rows = await baselines(["IBM Plex Sans Condensed", "IBM Plex Sans"]);
		expect(rows).toHaveLength(2);
		expect(baselineAt(rows, 0) - 20).toBeCloseTo(baselineAt(rows, 1) - 120, 3);
	});
	it.each([
		["IBM Plex Sans", 20.5],
		["Roboto Flex", 18.554688],
		["Geist", 20.1],
		["Ropa Sans", 16.82],
	] as const)("preserves %s's existing baseline", { timeout: 30_000 }, async (family, expected) => {
		const rows = await baselines([family]);
		expect(baselineAt(rows, 0) - 20).toBeCloseTo(expected, 3);
	});
	it.each([
		"Noto Sans HK",
		"Noto Sans SC",
		"Noto Serif SC",
		"Noto Sans TC",
		"Noto Serif TC",
		"Noto Sans JP",
		"Noto Serif JP",
		"Noto Sans KR",
		"Noto Serif KR",
	])("preserves %s's compact CJK lines at tight line height", { timeout: 60_000 }, async (family) => {
		const rows = await baselines([family], "高行\n高行", 0.8);
		expect(rows.map((row) => row.text)).toEqual(["高行", "高行"]);
		expect(baselineAt(rows, 0) - 20).toBeCloseTo(18, 3);
		// The newline uses the standard-font fallback. Keep the existing 21.6pt
		// line box; shrinking to the requested 16pt would clip the next line.
		expect(baselineAt(rows, 1) - baselineAt(rows, 0)).toBeCloseTo(21.6, 3);
	});
});
