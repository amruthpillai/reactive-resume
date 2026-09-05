import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";
import { resolveResumeRuntime } from "../../semantic/resolve";
import { rasterizePdf } from "../../semantic/test/rasterize-pdf";

type FixtureOptions = {
	columns: number;
	count: number;
	mode?: "semantic" | "legacy";
	configure?: (data: ResumeData) => void;
};

function setCss(data: ResumeData, css: string) {
	data.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 1, text: `@version 1; ${css}` } };
}

async function renderRatings({ columns, count, mode = "semantic", configure }: FixtureOptions) {
	const data = structuredClone(defaultResumeData);
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.page.hideIcons = true;
	data.metadata.design.colors.primary = "rgba(255, 0, 0, 1)";
	data.metadata.layout.pages = [{ fullWidth: true, main: ["skills"], sidebar: [] }];
	data.metadata.stylesheet = { mode, source: { languageVersion: 1, text: "@version 1;" } };
	data.sections.skills.columns = columns;
	data.sections.skills.items = Array.from({ length: count }, (_, index) => ({
		id: `skill-${index}`,
		hidden: false,
		icon: "",
		iconColor: "",
		name: `Skill ${index}`,
		proficiency: index === 1 ? "Experienced" : "",
		level: 5,
		keywords: index === 1 ? Array.from({ length: 12 }, (_, word) => `Keyword${word}`) : ["Short"],
	}));
	configure?.(data);
	expect(resolveResumeRuntime({ data, template: "onyx", mode }).diagnostics).toEqual([]);
	const bytes = await act(() => renderToBuffer(<ResumeDocument data={data} template="onyx" />));
	const pages = await rasterizePdf(new Uint8Array(bytes));
	const loading = getDocument({ data: new Uint8Array(bytes) });
	const text: string[] = [];
	try {
		const pdf = await loading.promise;
		for (let number = 1; number <= pdf.numPages; number++) {
			const page = await pdf.getPage(number);
			text.push((await page.getTextContent()).items.flatMap((item) => ("str" in item ? [item.str] : [])).join(" "));
		}
	} finally {
		await loading.destroy();
	}
	const rows = pages.map((page) => {
		const rows: { top: number; bottom: number; circles: number }[] = [];
		for (let y = 0; y < page.height; y++) {
			let redPixels = 0;
			let segments = 0;
			let previousRed = false;
			for (let x = 0; x < page.width; x++) {
				const offset = (y * page.width + x) * 4;
				const red = (page.data[offset] ?? 0) > 200 && (page.data[offset + 1] ?? 255) < 100;
				if (red) {
					redPixels++;
					if (!previousRed) segments++;
				}
				previousRed = red;
			}
			if (redPixels === 0) continue;
			const previous = rows.at(-1);
			if (previous && previous.bottom === y - 1) {
				previous.bottom = y;
				previous.circles = Math.max(previous.circles, segments);
			} else rows.push({ top: y, bottom: y, circles: segments });
		}
		// Onyx's thin section separator is red too; retain only the circle bands.
		return rows.filter((row) => row.bottom - row.top > 5);
	});
	return { rows, text: text.join(" ") };
}

describe("skill rating alignment (#3343)", () => {
	it.each(["semantic", "legacy"] as const)(
		"aligns mixed-height skills and preserves an incomplete row in %s mode",
		async (mode) => {
			const {
				rows: [rows],
				text,
			} = await renderRatings({ columns: 2, count: 3, mode });
			expect(rows).toHaveLength(2);
			if (!rows?.[0] || !rows[1]) throw new Error("Missing rating rows");
			// Ten circles share the first row; the remaining skill has five.
			expect(rows.map((row) => row.circles)).toEqual([10, 5]);
			expect(text).toContain("Keyword11");
			expect(text).toContain("Skill 2");
		},
	);
	it("aligns three columns and preserves an incomplete row", async () => {
		const {
			rows: [rows],
		} = await renderRatings({ columns: 3, count: 4 });
		expect(rows).toHaveLength(2);
		if (!rows?.[0] || !rows[1]) throw new Error("Missing rating rows");
		expect(rows.map((row) => row.circles)).toEqual([15, 5]);
	});
	it("retains every single-column rating beside its own content", async () => {
		const {
			rows: [rows],
			text,
		} = await renderRatings({ columns: 1, count: 3 });
		expect(rows).toHaveLength(3);
		for (const name of ["Skill 0", "Skill 1", "Skill 2", "Keyword11"]) expect(text).toContain(name);
	});
	it("aligns custom skill sections using their own column count", async () => {
		const {
			rows: [rows],
			text,
		} = await renderRatings({
			columns: 3,
			count: 4,
			configure: (data) => {
				data.customSections = [{ ...data.sections.skills, id: "custom-skills", type: "skills" }];
				data.sections.skills.columns = 1;
				data.sections.skills.items = [];
				data.metadata.layout.pages = [{ fullWidth: true, main: ["custom-skills"], sidebar: [] }];
			},
		});
		expect(rows).toHaveLength(2);
		expect(text).toContain("Keyword11");
	});
	it("does not add a rating for a skill with level zero", async () => {
		const {
			rows: [rows],
			text,
		} = await renderRatings({
			columns: 2,
			count: 3,
			configure: (data) => {
				const first = data.sections.skills.items[0];
				if (first) first.level = 0;
			},
		});
		expect(rows).toHaveLength(2);
		if (!rows?.[0] || !rows[1]) throw new Error("Missing rating rows");
		expect(rows.map((row) => row.circles)).toEqual([5, 5]);
		expect(text).toContain("Skill 0");
	});
	it("groups visible items after Semantic CSS filtering", async () => {
		const {
			rows: [rows],
			text,
		} = await renderRatings({
			columns: 2,
			count: 3,
			configure: (data) => setCss(data, 'section[type="skills"] item[id="skill-1"] { display: none; }'),
		});
		expect(rows).toHaveLength(1);
		expect(text).not.toContain("Skill 1");
		expect(text).toContain("Skill 2");
	});
	it("preserves author-specified item padding around aligned ratings", async () => {
		const baseline = await renderRatings({ columns: 2, count: 3 });
		const {
			rows: [rows],
		} = await renderRatings({
			columns: 2,
			count: 3,
			configure: (data) => setCss(data, 'section[type="skills"] item { padding-bottom: 12pt; }'),
		});
		expect(rows).toHaveLength(2);
		if (!rows?.[0] || !rows[1]) throw new Error("Missing rating rows");
		expect(rows.map((row) => row.circles)).toEqual([10, 5]);
		const defaultSecondRow = baseline.rows[0]?.[1];
		if (!defaultSecondRow) throw new Error("Missing default rating row");
		// The first row's 12pt bottom padding moves the next row by 18px.
		expect(Math.abs(rows[1].top - defaultSecondRow.top - 18)).toBeLessThanOrEqual(1);
	});
	it("retains aligned ratings and text across automatic page breaks", async () => {
		const { rows, text } = await renderRatings({
			columns: 3,
			count: 12,
			configure: (data) => setCss(data, "page { size: 300pt 220pt; }"),
		});
		expect(rows.length).toBeGreaterThan(1);
		expect(rows.flat()).toHaveLength(4);
		for (let index = 0; index < 12; index++) expect(text).toContain(`Skill ${index}`);
		expect(text).toContain("Keyword11");
		expect(rows.flat().map((row) => row.circles)).toEqual([15, 15, 15, 15]);
	});
});
