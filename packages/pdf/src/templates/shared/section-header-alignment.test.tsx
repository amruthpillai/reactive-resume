import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act, createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";

const fixture = (): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.metadata.page.marginX = 30;
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.layout.pages = [{ fullWidth: true, main: ["experience", "education"], sidebar: [] }];
	data.sections.experience.items = ["Engineer", "", "  "].map((position, index) => ({
		id: `experience-${index}`,
		hidden: false,
		company: `Company ${index}`,
		position,
		location: "London",
		period: `201${index}`,
		website: { url: "", label: "", inlineLink: false },
		description: "",
		roles: [],
	}));
	data.sections.education.items = ["Computing", "", "  ", ""].map((area, index) => ({
		id: `education-${index}`,
		hidden: false,
		school: `School ${index}`,
		degree: index === 3 ? "" : "Degree",
		area,
		grade: "",
		location: "Paris",
		period: `202${index}`,
		website: { url: "", label: "", inlineLink: false },
		description: "",
	}));
	return data;
};

const renderText = async (data: ResumeData, template: Template = "onyx") => {
	const element = createElement(ResumeDocument, { data, template }) as unknown as Parameters<typeof renderToBuffer>[0];
	let bytes: Uint8Array = new Uint8Array();
	await act(async () => {
		bytes = new Uint8Array(await renderToBuffer(element));
	});
	const loadingTask = getDocument({ data: bytes, useSystemFonts: true });
	try {
		const document = await loadingTask.promise;
		const page = await document.getPage(1);
		const content = await page.getTextContent();
		return content.items.filter((item): item is TextItem => "str" in item);
	} finally {
		await loadingTask.destroy();
	}
};

const findText = (items: TextItem[], text: string) => {
	const item = items.find((item) => item.str === text);
	if (!item) throw new Error(`Missing PDF text: ${text}`);
	return item;
};

const expectTrailingAlignment = (items: TextItem[]) => {
	const expectedText = ["2010", "2011", "2012", "Paris • 2020", "Paris • 2021", "Paris • 2022", "Paris • 2023"];
	for (const text of expectedText) {
		const item = findText(items, text);
		expect(item.transform[4] + item.width, text).toBeCloseTo(565.28, 1);
	}
};

describe("optional experience and education header fields (#3338)", () => {
	it.each(["legacy", "semantic"] as const)(
		"keeps dates at the trailing edge with empty leading fields in %s mode",
		async (mode) => {
			const data = fixture();
			data.metadata.stylesheet = { mode, source: { languageVersion: 1, text: "@version 1;" } };
			const items = await renderText(data);
			expectTrailingAlignment(items);
		},
	);

	it("preserves RTL row alignment when leading fields are empty", async () => {
		const data = fixture();
		data.metadata.page.locale = "ar-SA";
		const items = await renderText(data);
		expectTrailingAlignment(items);
	});

	it("preserves the leading alignment of stacked sidebar fields", async () => {
		const data = fixture();
		data.metadata.layout.pages = [{ fullWidth: false, main: [], sidebar: ["experience", "education"] }];
		const items = await renderText(data, "chikorita");
		for (const index of [0, 1, 2]) {
			expect(findText(items, `201${index}`).transform[4]).toBeCloseTo(
				findText(items, `Company ${index}`).transform[4],
				1,
			);
			expect(findText(items, `Paris • 202${index}`).transform[4]).toBeCloseTo(
				findText(items, `School ${index}`).transform[4],
				1,
			);
		}
	});
});
