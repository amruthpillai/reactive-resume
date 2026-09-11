import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act, createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";

const renderLevel = async (level: number, css = "") => {
	const data = structuredClone(defaultResumeData);
	data.basics.name = "Audit";
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.layout.pages = [{ fullWidth: true, main: ["skills"], sidebar: [] }];
	data.metadata.design.level = { type: "icon", icon: "star" };
	data.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 1, text: `@version 1; ${css}` } };
	data.sections.skills.items = [
		{ id: "skill", hidden: false, name: "Skill", proficiency: "Expert", level, keywords: [], icon: "", iconColor: "" },
	];
	const element = createElement(ResumeDocument, { data, template: "scizor" }) as unknown as Parameters<
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
		const operators = await page.getOperatorList();
		return operators.fnArray.flatMap((fn, index) => (fn === OPS.setGState ? operators.argsArray[index][0] : []));
	} finally {
		await loadingTask.destroy();
	}
};

describe("PDF icon opacity (#3352)", () => {
	it.each([1, 3, 4])("writes inactive level %i opacity to PDF graphics state", async (level) => {
		const states = await renderLevel(level);
		expect(states).toContainEqual(["ca", 0.35]);
		expect(states).toContainEqual(["CA", 0.35]);
	});
	it("honors semantic icon opacity overrides, including zero", async () => {
		const states = await renderLevel(
			3,
			'level icon[role~="active"] { opacity: 0.2; } level icon[role~="inactive"] { opacity: 0; }',
		);
		expect(states).toContainEqual(["ca", 0.2]);
		expect(states).toContainEqual(["CA", 0.2]);
		expect(states).toContainEqual(["ca", 0]);
		expect(states).toContainEqual(["CA", 0]);
		expect(states).not.toContainEqual(["ca", 0.35]);
	});
	it.each([0, 5])("does not dim fully active or hidden level %i", async (level) => {
		expect(await renderLevel(level)).not.toContainEqual(["ca", 0.35]);
	});
});
