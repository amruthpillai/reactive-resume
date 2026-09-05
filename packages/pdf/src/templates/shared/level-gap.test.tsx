import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { act } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";
import { resolveResumeRuntime } from "../../semantic/resolve";
import { rasterizePdf } from "../../semantic/test/rasterize-pdf";

// rasterizePdf renders at 1.5 pixels per PDF point. The default 10pt body
// font produces 8pt level circles via resolveLevelDisplaySizes.
const pdfRasterScale = 1.5;
const circleDiameterPt = 8;

async function circlePositions(declaration = "", mode: "semantic" | "legacy" = "semantic") {
	const data = structuredClone(defaultResumeData);
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.page.hideIcons = true;
	data.metadata.design.colors.primary = "rgba(255, 0, 0, 1)";
	data.metadata.layout.pages = [{ fullWidth: true, main: ["skills"], sidebar: [] }];
	data.metadata.stylesheet = {
		mode,
		source: { languageVersion: 1, text: `@version 1; section[type="skills"] level { ${declaration} }` },
	};
	data.sections.skills.items = [
		{
			id: "skill",
			hidden: false,
			icon: "",
			iconColor: "",
			name: "Skill",
			proficiency: "",
			level: 5,
			keywords: [],
		},
	];
	const runtime = resolveResumeRuntime({ data, template: "onyx", mode });
	const bytes = await act(() => renderToBuffer(<ResumeDocument data={data} template="onyx" />));
	const [page] = await rasterizePdf(new Uint8Array(bytes));
	if (!page) throw new Error("Missing PDF page");
	// Scan the actual circle raster for a row with five separate red segments.
	// The curved tops remain separate even when the circles have zero gap.
	for (let y = 0; y < page.height; y++) {
		const segments: { start: number; end: number }[] = [];
		let segment: { start: number; end: number } | undefined;
		for (let x = 0; x < page.width; x++) {
			const offset = (y * page.width + x) * 4;
			// Select the red decorations while excluding black text and white/antialiased background.
			const red = (page.data[offset] ?? 0) > 200 && (page.data[offset + 1] ?? 255) < 100;
			if (red) {
				if (segment) segment.end = x;
				else segment = { start: x, end: x };
			} else if (segment) {
				segments.push(segment);
				segment = undefined;
			}
		}
		if (segment) segments.push(segment);
		if (segments.length === 5)
			return {
				centers: segments.map(({ start, end }) => (start + end) / 2),
				y,
				diagnostics: runtime.diagnostics,
			};
	}
	throw new Error("Missing five level circles in PDF raster");
}

describe("semantic level gaps (#3040)", () => {
	it("preserves default circle geometry in legacy and semantic modes", async () => {
		expect(await circlePositions()).toEqual(await circlePositions("", "legacy"));
	});
	it.each([
		["gap: 0;", 0],
		["gap: 4pt;", 4],
		["gap: 3pt 5pt;", 5],
		["column-gap: 6pt;", 6],
		["row-gap: 9pt;", 4 / 3],
		["gap: 4pt; column-gap: 0;", 0],
	] as const)("renders %s on the level row", async (declaration, expectedGap) => {
		const baseline = await circlePositions();
		const actual = await circlePositions(declaration);
		expect(actual.y).toBe(baseline.y);
		expect(actual.centers[0]).toBe(baseline.centers[0]);
		for (let index = 1; index < actual.centers.length; index++) {
			const previous = actual.centers[index - 1];
			const current = actual.centers[index];
			if (previous === undefined || current === undefined) throw new Error("Missing circle center");
			expect(Math.abs(current - previous - (circleDiameterPt + expectedGap) * pdfRasterScale)).toBeLessThanOrEqual(0.5);
		}
		expect(actual.diagnostics).toEqual([]);
	});
});
