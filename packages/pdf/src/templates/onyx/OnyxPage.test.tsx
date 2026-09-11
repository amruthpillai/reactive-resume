import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act, createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";

const PICTURE =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ioAAAAASUVORK5CYII=";
const HEADLINE = Array.from({ length: 12 }, (_, index) => `Experience ${index} designing accessible applications`).join(
	" ",
);

const renderHeader = async (locale: string, hasPicture: boolean) => {
	const data = structuredClone(defaultResumeData);
	data.basics.name = "Audit";
	data.basics.headline = HEADLINE;
	data.picture.hidden = !hasPicture;
	data.picture.url = PICTURE;
	data.picture.size = 100;
	data.metadata.page.locale = locale;
	data.metadata.page.marginX = 30;
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 1, text: "@version 1;" } };
	data.metadata.layout.pages = [{ fullWidth: true, main: [], sidebar: [] }];
	const element = createElement(ResumeDocument, { data, template: "onyx" }) as unknown as Parameters<
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
		return content.items.filter(
			(item): item is TextItem => "str" in item && item.str !== "Audit" && Boolean(item.str.trim()),
		);
	} finally {
		await loadingTask.destroy();
	}
};

const renderOnyxWithProfiles = async () => {
	const data = structuredClone(defaultResumeData);
	data.basics.name = "Name";
	data.basics.headline = "Headline";
	data.basics.email = "email@example.com";
	data.picture.hidden = true;
	data.summary = {
		...data.summary,
		hidden: false,
		showHeading: false,
		content: "<p>Summary body text</p>",
	};
	data.sections.profiles = {
		...data.sections.profiles,
		hidden: false,
		showHeading: false,
		items: [
			{
				id: "profile-1",
				hidden: false,
				icon: "github-logo",
				iconColor: "",
				network: "GitHub",
				username: "dkowalski-dev",
				website: { url: "https://github.com/dkowalski-dev", label: "", inlineLink: false },
			},
		],
	};
	data.metadata.page.locale = "en-US";
	data.metadata.page.marginX = 14;
	data.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 1, text: "@version 1;" } };
	data.metadata.layout.pages = [{ fullWidth: false, main: ["summary", "profiles"], sidebar: [] }];
	const element = createElement(ResumeDocument, { data, template: "onyx" }) as unknown as Parameters<
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
		return content.items.filter((item): item is TextItem => "str" in item && Boolean(item.str.trim()));
	} finally {
		await loadingTask.destroy();
	}
};

describe("Onyx headline width (#3339)", () => {
	it.each([
		{ locale: "en-US", hasPicture: true },
		{ locale: "ar-SA", hasPicture: true },
		{ locale: "en-US", hasPicture: false },
	])(
		"keeps the complete headline within page margins ($locale, picture: $hasPicture)",
		async ({ locale, hasPicture }) => {
			const lines = await renderHeader(locale, hasPicture);
			expect(
				lines
					.map((line) => line.str)
					.join(" ")
					.replace(/\s+/g, " "),
			).toBe(HEADLINE);
			for (const line of lines) {
				expect(line.transform[4]).toBeGreaterThanOrEqual(29.9);
				expect(line.transform[4] + line.width).toBeLessThanOrEqual(565.38);
			}
			if (locale === "en-US" && hasPicture) {
				// The 100pt photo keeps its width, followed by the configured 4pt gap.
				expect(lines[0]?.transform[4]).toBeCloseTo(134, 1);
			}
		},
	);
});

describe("Onyx profiles header (#2812)", () => {
	it("renders visible profile items in the header instead of the body", async () => {
		const lines = await renderOnyxWithProfiles();
		const profileLine = lines.find((line) => line.str.includes("dkowalski-dev"));
		const summaryLine = lines.find((line) => line.str.includes("Summary body"));

		expect(profileLine).toBeDefined();
		expect(summaryLine).toBeDefined();
		expect(profileLine?.transform[5]).toBeGreaterThan(summaryLine?.transform[5]);
	});

	it("does not render the network name as text in the header", async () => {
		const lines = await renderOnyxWithProfiles();
		expect(lines.some((line) => line.str === "GitHub")).toBe(false);
	});
});
