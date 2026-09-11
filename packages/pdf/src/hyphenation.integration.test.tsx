import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createElement } from "react";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { ResumeDocument } from "./document";
import { resolveResumeRuntime } from "./semantic/resolve";

function resume(hyphenation: boolean, locale = "de-DE"): ResumeData {
	const data = structuredClone(sampleResumeData);
	data.picture.hidden = true;
	data.basics.name = "Probe";
	data.basics.headline = "";
	data.basics.email = "";
	data.basics.phone = "";
	data.basics.location = "";
	data.basics.website.url = "";
	data.basics.customFields = [];
	data.metadata.page.locale = locale;
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.typography.hyphenation = hyphenation;
	data.metadata.layout.pages = [{ fullWidth: true, main: ["summary"], sidebar: [] }];
	data.summary.title = "Text";
	data.summary.content = "<p>Gewerbesteuerdurchführungsverordnung</p>";
	data.metadata.stylesheet = {
		mode: "semantic",
		source: {
			languageVersion: 1,
			text: "@version 1; section { width: 100pt; } paragraph, list-item-content { font-size: 12pt; text-align: justify; }",
		},
	};
	return data;
}

async function pdfText(data: ResumeData) {
	expect(resolveResumeRuntime({ data, template: "onyx", mode: "semantic" }).diagnostics).toEqual([]);
	const element = createElement(ResumeDocument, { data, template: "onyx" }) as unknown as Parameters<
		typeof renderToBuffer
	>[0];
	const bytes = new Uint8Array(await renderToBuffer(element));
	const loading = getDocument({ data: bytes });
	try {
		const document = await loading.promise;
		const items: string[] = [];
		for (let number = 1; number <= document.numPages; number++) {
			const page = await document.getPage(number);
			items.push(...(await page.getTextContent()).items.flatMap((item) => ("str" in item ? [item.str] : [])));
		}
		return items.join(" ");
	} finally {
		await loading.destroy();
	}
}

describe("German PDF hyphenation", () => {
	it("hyphenates long German words only when enabled, retaining every letter", { timeout: 60_000 }, async () => {
		const disabled = await pdfText(resume(false));
		const enabled = await pdfText(resume(true));
		expect(disabled).not.toContain("-");
		expect(enabled).toContain("-");
		expect(enabled.replaceAll(/[\s-]/g, "")).toContain("Gewerbesteuerdurchführungsverordnung");
	});
	it.each([
		["bold", "<p><strong>Gewerbesteuerdurchführungsverordnung</strong></p>"],
		["inline link", '<p><a href="https://example.com">Gewerbesteuerdurchführungsverordnung</a></p>'],
		["list paragraph", "<ul><li><p>Gewerbesteuerdurchführungsverordnung</p></li></ul>"],
		["bare list text", "<ul><li>Gewerbesteuerdurchführungsverordnung</li></ul>"],
		["bare HTML text", "Gewerbesteuerdurchführungsverordnung"],
	])("hyphenates %s in rich text", { timeout: 60_000 }, async (_name, content) => {
		const data = resume(true);
		data.summary.content = content;
		const text = await pdfText(data);
		expect(text).toContain("-");
		expect(text.replaceAll(/[\s-]/g, "")).toContain("Gewerbesteuerdurchführungsverordnung");
	});

	it("keeps callbacks isolated across overlapping enabled and disabled exports", { timeout: 60_000 }, async () => {
		const cases = [resume(true), resume(false), resume(true, "en-US"), resume(true), resume(false)];
		const original = structuredClone(cases);
		const texts = await Promise.all(cases.map(pdfText));
		for (const index of [0, 3]) expect(texts[index]).toContain("-");
		for (const index of [1, 2, 4]) expect(texts[index]).not.toContain("-");
		expect(cases).toEqual(original);
	});

	it("shows authored soft hyphens only at a line break", { timeout: 60_000 }, async () => {
		const data = resume(true);
		data.summary.content = "<p>Gewerbesteuer&shy;durchführungsverordnung</p>";
		const narrow = await pdfText(data);
		expect(narrow).toContain("Gewerbesteuer-");
		expect(narrow.replaceAll(/[\s-]/g, "")).toContain("Gewerbesteuerdurchführungsverordnung");
		data.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 1, text: "@version 1;" } };
		const wide = await pdfText(data);
		expect(wide).toContain("Gewerbesteuerdurchführungsverordnung");
		expect(wide).not.toContain("-");
		expect(wide).not.toContain("\u00AD");
	});

	it("hyphenates native text buckets inside bare table cells", { timeout: 60_000 }, async () => {
		const data = resume(true);
		data.summary.content = '<table style="width: 100pt"><tr><td>Gewerbesteuerdurchführungsverordnung</td></tr></table>';
		data.metadata.stylesheet = {
			mode: "legacy",
			source: { languageVersion: 1, text: "@version 1; section { width: 100pt; }" },
		};
		const text = await pdfText(data);
		expect(text).toContain("-");
		expect(text.replaceAll(/[\s-]/g, "")).toContain("Gewerbesteuerdurchführungsverordnung");
	});
	it.each([false, true])(
		"hyphenates plain company fields and standalone links (linked=%s)",
		{ timeout: 60_000 },
		async (linked) => {
			const data = resume(true);
			const item = data.sections.experience.items[0];
			if (!item) throw new Error("Expected sample experience.");
			data.sections.experience.items = [
				{
					...item,
					company: "Gewerbesteuerdurchführungsverordnung",
					position: "",
					location: "",
					period: "",
					description: "",
					roles: [],
					website: { url: linked ? "https://example.com" : "", label: "", inlineLink: true },
				},
			];
			data.metadata.layout.pages = [{ fullWidth: true, main: ["experience"], sidebar: [] }];
			data.metadata.stylesheet = {
				mode: "semantic",
				source: { languageVersion: 1, text: "@version 1; section { width: 100pt; }" },
			};
			const text = await pdfText(data);
			expect(text).toContain("-");
			expect(text.replaceAll(/[\s-]/g, "")).toContain("Gewerbesteuerdurchführungsverordnung");
		},
	);
});
