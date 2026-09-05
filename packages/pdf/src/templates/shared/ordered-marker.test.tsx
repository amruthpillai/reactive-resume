import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";
import { resolveResumeRuntime } from "../../semantic/resolve";

type Options = {
	font: string;
	rtl?: boolean;
	columns?: number;
	count?: number;
	css?: string;
	nested?: boolean;
	sidebar?: boolean;
};
type Run = { text: string; x: number; right: number; y: number; page: number };

async function renderList({
	font,
	rtl = false,
	columns = 1,
	count = 102,
	css = "",
	nested = false,
	sidebar = false,
}: Options) {
	const data = structuredClone(defaultResumeData);
	data.metadata.typography.body.fontFamily = font;
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.page.hideIcons = true;
	if (rtl) data.metadata.page.locale = "ar-SA";
	data.metadata.layout.pages = [
		{ fullWidth: !sidebar, main: sidebar ? [] : ["projects"], sidebar: sidebar ? ["projects"] : [] },
	];
	data.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 1, text: `@version 1; ${css}` } };
	data.sections.projects.columns = columns;
	data.sections.projects.items = Array.from({ length: columns }, (_, column) => ({
		id: `project-${column}`,
		hidden: false,
		name: `Project${column}`,
		period: "",
		website: { url: "", label: "", inlineLink: false },
		// Distinct body weight keeps marker and content separate in PDF.js text runs.
		description: `${nested ? "<ul><li>Outer" : ""}<ol>${Array.from({ length: count }, (_, index) => `<li><strong>ITEM${column}_${String(index + 1).padStart(3, "0")}</strong></li>`).join("")}</ol>${nested ? "</li></ul>" : ""}`,
	}));
	expect(resolveResumeRuntime({ data, template: "rhyhorn", mode: "semantic" }).diagnostics).toEqual([]);
	const bytes = await act(() => renderToBuffer(<ResumeDocument data={data} template="rhyhorn" />));
	const loading = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
	try {
		const document = await loading.promise;
		const runs: Run[] = [];
		for (let page = 1; page <= document.numPages; page++) {
			const text = await (await document.getPage(page)).getTextContent();
			for (const item of text.items) {
				if ("str" in item && item.str)
					runs.push({
						text: item.str,
						x: item.transform[4],
						right: item.transform[4] + item.width,
						y: item.transform[5],
						page,
					});
			}
		}
		return { runs, pages: document.numPages };
	} finally {
		await loading.destroy();
	}
}

function assertGutters(runs: Run[], { count = 102, columns = 1, rtl = false }: Options) {
	for (let column = 0; column < columns; column++) {
		const edges: number[] = [];
		for (let index = 1; index <= count; index++) {
			const bodies = runs.filter((run) => run.text === `ITEM${column}_${String(index).padStart(3, "0")}`);
			expect(bodies).toHaveLength(1);
			const body = bodies[0];
			if (!body) throw new Error(`Missing body ${index}`);
			const marker = runs
				.filter(
					(run) =>
						run.text === (rtl ? `.${index}` : `${index}.`) && run.page === body.page && Math.abs(run.y - body.y) < 10,
				)
				.sort((a, b) => Math.abs(a.x - body.x) - Math.abs(b.x - body.x))[0];
			expect(marker, `missing marker ${index} on content page`).toBeDefined();
			if (!marker) throw new Error(`Missing marker ${index}`);
			expect(rtl ? marker.x - body.right : body.x - marker.right, `marker ${index} gutter`).toBeGreaterThan(0.5);
			edges.push(rtl ? body.right : body.x);
		}
		expect(Math.max(...edges) - Math.min(...edges)).toBeLessThan(0.01);
	}
}

describe("ordered marker gutters (#2751)", () => {
	it.each([false, true])("keeps a common gutter with authored letter spacing (RTL=%s)", async (rtl) => {
		const options = { font: "Helvetica", count: 12, rtl, css: "list-marker { letter-spacing: 4pt; }" };
		const bodies = (await renderList(options)).runs.filter((run) => run.text.startsWith("ITEM0_"));
		expect(bodies).toHaveLength(12);
		const edges = bodies.map((run) => (rtl ? run.right : run.x));
		expect(Math.max(...edges) - Math.min(...edges)).toBeLessThan(0.01);
	});
	for (const rtl of [false, true]) {
		for (const count of [9, 12, 102]) {
			it.each(["Helvetica", "Courier", "Noto Serif SC"])(
				`keeps %s markers clear in ${rtl ? "RTL" : "LTR"} ${count}-item lists`,
				async (font) => {
					const options = { font, count, rtl };
					const { runs, pages } = await renderList(options);
					if (count === 102) expect(pages).toBeGreaterThan(1);
					assertGutters(runs, options);
				},
				20000, // Include the first CJK font download during concurrent suite runs.
			);
		}
		it.each([{ columns: 3 }, { sidebar: true }, ...(rtl ? [] : [{ nested: true }])])(
			`keeps ${rtl ? "RTL" : "LTR"} markers clear in %j`,
			async (placement) => {
				const options = { font: "Courier", count: 12, rtl, ...placement };
				assertGutters((await renderList(options)).runs, options);
			},
		);
	}
	it("retains every nested RTL item", async () => {
		// The existing RTL Text wrapper flattens nested lists into inline text.
		// Preserve their content without asserting unsupported nested row geometry.
		const { runs } = await renderList({ font: "Courier", rtl: true, nested: true, count: 12 });
		const items =
			runs
				.map((run) => run.text)
				.join("")
				.match(/ITEM0_\d{3}/g) ?? [];
		for (let index = 1; index <= 12; index++) {
			expect(items.filter((item) => item === `ITEM0_${String(index).padStart(3, "0")}`)).toHaveLength(1);
		}
	});
	it.each(["list-marker { font-size: 20pt; }", "field { font-size: 20pt; } list-marker { font-size: inherit; }"])(
		"sizes the gutter for authored font size: %s",
		async (css) => {
			const options = { font: "Courier", count: 12, css };
			const { runs } = await renderList(options);
			// Different font sizes have different baselines; compare horizontal extents.
			const marker = runs.find((run) => run.text === "10.");
			const body = runs.find((run) => run.text === "ITEM0_010");
			if (!marker || !body) throw new Error("Missing tenth item");
			expect(body.x - marker.right).toBeGreaterThan(0.5);
		},
	);
	it.each([4, 12])("preserves an explicitly authored %ipt row gap", async (gap) => {
		const { runs } = await renderList({ font: "Helvetica", count: 12, css: `list-item { column-gap: ${gap}pt; }` });
		const body = runs.find((run) => run.text === "ITEM0_010");
		const baseline = (await renderList({ font: "Helvetica", count: 12 })).runs.find((run) => run.text === "ITEM0_010");
		if (!body || !baseline) throw new Error("Missing content");
		expect(body.x - baseline.x).toBeCloseTo(gap - 4 / 3, 3);
	});
});
