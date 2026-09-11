import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act, createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";

const renderHeading = async (css: string, hideSectionIcons = false) => {
	const data = structuredClone(defaultResumeData);
	data.basics.name = "Audit";
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.page.hideSectionIcons = hideSectionIcons;
	data.metadata.layout.pages = [{ fullWidth: true, main: ["skills"], sidebar: [] }];
	data.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 1, text: `@version 1; ${css}` } };
	data.sections.skills.items = [
		{ id: "skill", hidden: false, name: "Skill", proficiency: "", level: 0, keywords: [], icon: "", iconColor: "" },
	];
	const element = createElement(ResumeDocument, {
		data,
		template: "scizor",
		resolveSectionTitle: () => "Heading",
	}) as unknown as Parameters<typeof renderToBuffer>[0];
	let bytes: Uint8Array = new Uint8Array();
	await act(async () => {
		bytes = new Uint8Array(await renderToBuffer(element));
	});
	const loadingTask = getDocument({ data: bytes, useSystemFonts: true });
	try {
		const document = await loadingTask.promise;
		const page = await document.getPage(1);
		const operators = await page.getOperatorList();
		let fill = "";
		const text: { value: string; fill: string }[] = [];
		const colors: string[] = [];
		for (const [index, fn] of operators.fnArray.entries()) {
			const args = operators.argsArray[index];
			if (fn === OPS.setFillRGBColor) fill = args[0];
			if (fn === OPS.setFillRGBColor || fn === OPS.setStrokeRGBColor) colors.push(args[0]);
			if (fn === OPS.showText)
				text.push({
					value: args[0]
						.map((glyph: { unicode?: string } | number) => (typeof glyph === "number" ? "" : (glyph.unicode ?? "")))
						.join(""),
					fill,
				});
		}
		return { text, colors };
	} finally {
		await loadingTask.destroy();
	}
};

describe("Semantic section heading colors (#3348)", () => {
	it.each([false, true])("colors heading text with hideSectionIcons=%s", async (hidden) => {
		const { text } = await renderHeading("section-heading { color: #1234ef; }", hidden);
		expect(text).toContainEqual({ value: "HEADING", fill: "#1234ef" });
	});
	it("colors explicitly targeted section icons", async () => {
		const { colors } = await renderHeading("section-heading icon { color: #178a6b; }");
		expect(colors).toContain("#178a6b");
	});
	it("allows independent heading and icon colors", async () => {
		const { text, colors } = await renderHeading(
			"section-heading { color: #1234ef; } section-heading icon { color: #178a6b; }",
		);
		expect(text).toContainEqual({ value: "HEADING", fill: "#1234ef" });
		expect(colors).toContain("#178a6b");
	});
	it("retains template colors without a custom rule", async () => {
		const { text, colors } = await renderHeading("");
		expect(text).toContainEqual({ value: "HEADING", fill: "#000000" });
		expect(colors).toContain("#dc2626");
	});
});
