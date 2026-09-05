import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";

type FixtureOptions = {
	mode: "legacy" | "semantic";
	columns: number;
	gapX: number;
	rtl?: boolean;
	sidebar?: boolean;
	longTitle?: boolean;
	experience?: boolean;
	css?: string;
};

type TextRun = { text: string; x: number; right: number; y: number };

function fixture({ mode, columns, gapX, rtl, sidebar, longTitle, experience, css = "" }: FixtureOptions): ResumeData {
	const data = structuredClone(defaultResumeData);
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.page.gapX = gapX;
	data.metadata.page.hideIcons = true;
	if (rtl) data.metadata.page.locale = "ar-SA";
	const section = experience ? "experience" : "projects";
	data.metadata.layout.pages = [
		{ fullWidth: false, main: sidebar ? [] : [section], sidebar: sidebar ? [section] : [] },
	];
	data.metadata.stylesheet = { mode, source: { languageVersion: 1, text: `@version 1; ${css}` } };
	data.sections.projects.columns = columns;
	data.sections.experience.columns = columns;
	for (let index = 0; index < 3; index++) {
		const name = `Project${index}${longTitle ? " wrapping project title with several additional words" : ""}`;
		const shared = {
			id: `project-${index}`,
			hidden: false,
			period: "",
			description: `<p>Description${index} with enough words to wrap across the narrower column and preserve alignment.</p>`,
			website: { url: `https://example.com/${index}`, label: `Website${index}`, inlineLink: false },
		};
		if (experience) {
			data.sections.experience.items.push({ ...shared, company: name, position: "", location: "", roles: [] });
		} else data.sections.projects.items.push({ ...shared, name });
	}
	return data;
}

async function renderText(options: FixtureOptions): Promise<TextRun[]> {
	const bytes = await act(() => renderToBuffer(<ResumeDocument data={fixture(options)} template="ditgar" />));
	const loading = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
	try {
		const document = await loading.promise;
		expect(document.numPages).toBe(1);
		const page = await document.getPage(1);
		return (await page.getTextContent()).items.flatMap((item) =>
			"str" in item && item.str
				? [{ text: item.str, x: item.transform[4], right: item.transform[4] + item.width, y: item.transform[5] }]
				: [],
		);
	} finally {
		await loading.destroy();
	}
}

function assertAligned(runs: TextRun[], rtl = false, expectedOffset = 0) {
	for (let index = 0; index < 3; index++) {
		const title = runs.find((run) => run.text.startsWith(`Project${index}`));
		const description = runs.find((run) => run.text.startsWith(`Description${index}`));
		const website = runs.find((run) => run.text === `Website${index}`);
		if (!title || !description || !website) throw new Error(`Missing project ${index} text`);
		const edge = rtl ? "right" : "x";
		expect(title[edge] - description[edge]).toBeCloseTo(expectedOffset, 3);
		// Ditgar's separate website links stay left-aligned in RTL layouts.
		if (!rtl) expect(title.x - website.x).toBeCloseTo(expectedOffset, 3);
		else expect(website.right).toBeLessThanOrEqual(title.right);
		expect(title.y).toBeGreaterThan(description.y);
	}
}

describe("Ditgar item-header alignment (#3068)", () => {
	for (const mode of ["legacy", "semantic"] as const) {
		for (const columns of [1, 2]) {
			it.each([0, 4, 12])(`aligns ${mode} Projects in ${columns} columns at gapX %i`, async (gapX) => {
				assertAligned(await renderText({ mode, columns, gapX }));
			});
		}
		it(`aligns wrapped ${mode} project titles with their descriptions and links`, async () => {
			assertAligned(await renderText({ mode, columns: 2, gapX: 4, longTitle: true }));
		});
		it(`aligns the shared ${mode} Experience header`, async () => {
			assertAligned(await renderText({ mode, columns: 2, gapX: 4, experience: true }));
		});
		it(`preserves ${mode} sidebar alignment`, async () => {
			assertAligned(await renderText({ mode, columns: 1, gapX: 4, sidebar: true }));
		});
		it(`preserves ${mode} RTL alignment`, async () => {
			assertAligned(await renderText({ mode, columns: 2, gapX: 4, rtl: true }), true);
		});
	}
	it("retains an authored Semantic CSS header inset", async () => {
		assertAligned(
			await renderText({
				mode: "semantic",
				columns: 2,
				gapX: 4,
				css: "item-header { margin-left: 7pt; padding-left: 3pt; border-left: 2pt solid #0000ff; }",
			}),
			false,
			12,
		);
	});
});
