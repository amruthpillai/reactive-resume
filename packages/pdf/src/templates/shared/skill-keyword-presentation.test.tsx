import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { encode } from "fast-png";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act } from "react";
import { ResumeDocument } from "../../document";
import { resolveResumeRuntime } from "../../semantic/resolve";
import { rasterizePdf } from "../../semantic/test/rasterize-pdf";
import { createSkillKeywordFixture } from "./skill-keyword-fixture";

function required<T>(value: T | null | undefined): T {
	if (value === undefined || value === null) throw new Error("Missing fixture output");
	return value;
}

async function renderKeywords(data: ReturnType<typeof createSkillKeywordFixture>) {
	const bytes = await act(() => renderToBuffer(<ResumeDocument data={data} template="leafish" />));
	const loading = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
	try {
		const pdf = await loading.promise;
		const pages = [];
		for (let n = 1; n <= pdf.numPages; n++) {
			const content = await (await pdf.getPage(n)).getTextContent();
			pages.push(content.items.flatMap((item) => ("str" in item ? [item] : [])));
		}
		return {
			bytes,
			pages,
			text: pages
				.flat()
				.map((item) => item.str)
				.join(" "),
		};
	} finally {
		await loading.destroy();
	}
}

describe("skill keyword presentation", () => {
	it.each([1, 2])("preserves comma output for stacked and inline item layouts with %s columns", async (columns) => {
		for (const layout of ["default", "inline"] as const) {
			const result = await renderKeywords(createSkillKeywordFixture({ layout, columns }));
			expect(result.text).toContain("Alpha, Beta, Gamma");
			expect(await rasterizePdf(new Uint8Array(result.bytes))).toHaveLength(1);
		}
	});
	it.each([false, true])("renders three separate bullet entries with custom=%s", async (custom) => {
		const { text, pages } = await renderKeywords(
			createSkillKeywordFixture({ keywordLayout: "list", custom, columns: 2 }),
		);
		for (const word of ["Alpha", "Beta", "Gamma"]) expect(text.split(word)).toHaveLength(2);
		expect(text.match(/•/g)).toHaveLength(3);
		expect(text).not.toContain(",");
		const ys = required(pages[0])
			.filter((item) => ["Alpha", "Beta", "Gamma"].some((word) => item.str.includes(word)))
			.map((item) => item.transform[5]);
		expect(new Set(ys).size).toBe(3);
	});
	it.each([[], ["Café"], ["naïve", "München", "résumé"]].map((keywords) => ({ keywords })))(
		"retains Unicode and empty keyword arrays: $keywords",
		async ({ keywords }) => {
			const { text } = await renderKeywords(
				createSkillKeywordFixture({ keywordLayout: "list", keywords, layout: "inline" }),
			);
			expect(text.match(/•/g) ?? []).toHaveLength(keywords.length);
			for (const word of keywords) expect(text.split(word)).toHaveLength(2);
		},
	);
	it("wraps long keywords and emits each marker once across physical pages", async () => {
		const keywords = Array.from(
			{ length: 18 },
			(_, i) => `Entry${i.toString().padStart(2, "0")} ${"wrapping keyword text ".repeat(9)}`,
		);
		const data = createSkillKeywordFixture({ keywordLayout: "list", keywords });
		data.metadata.stylesheet = {
			mode: "semantic",
			source: { languageVersion: 1, text: "@version 1; page { size: 300pt 220pt; }" },
		};
		const { text, pages } = await renderKeywords(data);
		expect(pages.length).toBeGreaterThan(1);
		expect(text.match(/•/g)).toHaveLength(18);
		for (let i = 0; i < 18; i++) expect(text.split(`Entry${i.toString().padStart(2, "0")}`)).toHaveLength(2);
		for (const page of pages)
			for (const item of page) {
				expect(item.transform[4]).toBeGreaterThanOrEqual(0);
				expect(item.transform[4] + item.width).toBeLessThanOrEqual(301);
			}
	});
	it("honors hidden items and semantic keyword typography", async () => {
		const data = createSkillKeywordFixture({ keywordLayout: "list" });
		data.sections.skills.items.push({
			...required(data.sections.skills.items[0]),
			id: "hidden",
			hidden: true,
			keywords: ["Secret"],
		});
		data.sections.skills.items.push({
			...required(data.sections.skills.items[0]),
			id: "css-hidden",
			hidden: false,
			keywords: ["Suppressed"],
		});
		data.metadata.stylesheet = {
			mode: "semantic",
			source: {
				languageVersion: 1,
				text: '@version 1; section[type="skills"] field[name="keywords"] { font-size: 18pt; } section[type="skills"] item[id="css-hidden"] { display: none; }',
			},
		};
		const runtime = resolveResumeRuntime({ data, template: "leafish", mode: "semantic" });
		expect(runtime.diagnostics).toEqual([]);
		const { text, pages } = await renderKeywords(data);
		expect(text).toContain("Engineering");
		expect(text).not.toContain("Secret");
		expect(text).not.toContain("Suppressed");
		const keywords = pages.flat().filter((item) => /Alpha|Beta|Gamma/.test(item.str));
		expect(keywords).toHaveLength(3);
		for (const keyword of keywords) expect(keyword.height).toBeCloseTo(18);
	});
	it("renders reviewable default and list artifacts without changing comma pixels", async () => {
		const inline = createSkillKeywordFixture();
		const legacy = createSkillKeywordFixture();
		Reflect.deleteProperty(legacy.sections.skills, "keywordLayout");
		const before = await renderKeywords(legacy);
		const after = await renderKeywords(inline);
		const oldRaster = await rasterizePdf(new Uint8Array(before.bytes));
		const newRaster = await rasterizePdf(new Uint8Array(after.bytes));
		expect(createHash("sha256").update(required(newRaster[0]).data).digest("hex")).toBe(
			createHash("sha256").update(required(oldRaster[0]).data).digest("hex"),
		);
		const list = await renderKeywords(createSkillKeywordFixture({ keywordLayout: "list" }));
		const listRaster = await rasterizePdf(new Uint8Array(list.bytes));
		expect(createHash("sha256").update(required(listRaster[0]).data).digest("hex")).not.toBe(
			createHash("sha256").update(required(newRaster[0]).data).digest("hex"),
		);
		const output = process.env.SKILL_KEYWORD_ARTIFACT_DIR;
		if (output) {
			mkdirSync(output, { recursive: true });
			for (const [name, result, raster] of [
				["inline", after, newRaster],
				["list", list, listRaster],
			] as const) {
				writeFileSync(join(output, `${name}.pdf`), result.bytes);
				writeFileSync(join(output, `${name}.txt`), result.text);
				writeFileSync(join(output, `${name}.png`), encode(required(raster[0])));
			}
		}
	});

	it("retains keyword lists in separate columns with mixed item heights", async () => {
		const data = createSkillKeywordFixture({ keywordLayout: "list", columns: 2 });
		data.sections.skills.items.push({
			...required(data.sections.skills.items[0]),
			id: "second",
			name: "Design",
			keywords: ["Delta", `Epsilon ${"long wrapping keyword ".repeat(8)}`, "Zeta"],
		});
		const { text, pages } = await renderKeywords(data);
		expect(text.match(/•/g)).toHaveLength(6);
		for (const word of ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta"]) expect(text.split(word)).toHaveLength(2);
		const first = required(required(pages[0]).find((item) => item.str.includes("Alpha")));
		const second = required(required(pages[0]).find((item) => item.str.includes("Delta")));
		expect(second.transform[4] - first.transform[4]).toBeGreaterThan(150);
		expect(first.transform[5]).toBeCloseTo(second.transform[5]);
	});
});
