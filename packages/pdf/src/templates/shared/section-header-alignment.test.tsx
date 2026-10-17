import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act, createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";
import { renderToBuffer } from "../../forme/testing";

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

const renderText = async (data: ResumeData) => {
	const element = createElement(ResumeDocument, { data, template: data.metadata.template }) as unknown as Parameters<
		typeof renderToBuffer
	>[0];
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

/** Dates end flush with the content box's right edge. */
const expectTrailingAlignment = (items: TextItem[]) => {
	const expectedText = ["2010", "2011", "2012", "Paris • 2020", "Paris • 2021", "Paris • 2022", "Paris • 2023"];
	for (const text of expectedText) {
		const item = findText(items, text);
		expect(item.transform[4] + item.width, text).toBeCloseTo(565.28, 1);
	}
};

describe("optional experience and education header fields (#3338)", () => {
	it("keeps dates at the trailing edge with empty leading fields", async () => {
		const data = fixture();
		data.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 1, text: "@version 1;" } };
		const items = await renderText(data);
		expectTrailingAlignment(items);
	});
});

describe.each(["persian", "onyx"] as const)("%s section heading direction", (template) => {
	it.each(["en-US", "ar-SA"])("keeps headings at the reading edge with and without icons in %s", async (locale) => {
		for (const hideSectionIcons of [false, true]) {
			const data = fixture();
			data.metadata.template = template;
			data.metadata.page.locale = locale;
			data.metadata.page.hideSectionIcons = hideSectionIcons;
			data.sections.experience.title = "Experience";
			data.sections.education.title = "Education";
			const items = await renderText(data);
			for (const title of ["Experience", "Education"]) {
				const heading = findText(items, title);
				if (locale === "ar-SA") {
					expect(heading.transform[4] + heading.width, `${title}, icons hidden: ${hideSectionIcons}`).toBeGreaterThan(
						530,
					);
				} else {
					expect(heading.transform[4], `${title}, icons hidden: ${hideSectionIcons}`).toBeLessThan(60);
				}
			}
		}
	});
});
