import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it } from "vite-plus/test";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";
import { renderToBuffer } from "../../forme/testing";

type FixtureOptions = { columns: number; gapX: number };

type TextRun = { text: string; x: number; y: number };

function fixture({ columns, gapX }: FixtureOptions): ResumeData {
	const data = structuredClone(defaultResumeData);
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.page.gapX = gapX;
	data.metadata.page.hideIcons = true;
	data.metadata.layout.pages = [{ fullWidth: false, main: ["projects"], sidebar: [] }];
	data.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 1, text: "@version 1;" } };
	data.sections.projects.columns = columns;
	for (let index = 0; index < 3; index++) {
		data.sections.projects.items.push({
			id: `project-${index}`,
			hidden: false,
			name: `Project${index}`,
			period: "",
			description: `<p>Description${index} with enough words to wrap across the narrower column and preserve alignment.</p>`,
			website: { url: `https://example.com/${index}`, label: `Website${index}`, inlineLink: false },
		});
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
			"str" in item && item.str ? [{ text: item.str, x: item.transform[4], y: item.transform[5] }] : [],
		);
	} finally {
		await loading.destroy();
	}
}

function assertAligned(runs: TextRun[]) {
	for (let index = 0; index < 3; index++) {
		const title = runs.find((run) => run.text.startsWith(`Project${index}`));
		const description = runs.find((run) => run.text.startsWith(`Description${index}`));
		const website = runs.find((run) => run.text === `Website${index}`);
		if (!title || !description || !website) throw new Error(`Missing project ${index} text`);
		expect(title.x - description.x).toBeCloseTo(0, 3);
		expect(title.x - website.x).toBeCloseTo(0, 3);
		expect(title.y).toBeGreaterThan(description.y);
	}
}

describe("Ditgar item-header alignment (#3068)", () => {
	it("aligns Projects in 1 columns at gapX 4", async () => {
		assertAligned(await renderText({ columns: 1, gapX: 4 }));
	});
});
