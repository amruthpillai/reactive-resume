import { expect, it } from "vitest";
import * as forme from "@formepdf/core";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { renderResume } from "./render";

it("preserves arrows with a standard PDF font", { timeout: 60_000 }, async () => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.metadata.template = "onyx";
	data.metadata.typography.body.fontFamily = "Times-Roman";
	data.metadata.typography.heading.fontFamily = "Times-Roman";
	data.metadata.layout.pages = [{ fullWidth: true, main: ["summary"], sidebar: [] }];
	data.summary.hidden = false;
	data.summary.content = "<p>Hours → Minutes; <strong>Hours → Minutes</strong>; <em>Hours → Minutes</em></p>";

	const engine = { renderSerializedDocWithLayout: forme.renderSerializedDocWithLayout };
	const result = await act(() => renderResume(engine, { data }));
	const task = getDocument({ data: result.pdf });
	try {
		const page = await (await task.promise).getPage(1);
		const operators = await page.getOperatorList();
		const arrows = operators.fnArray.flatMap((operation, index) =>
			operation === OPS.showText
				? operators.argsArray[index][0].filter((glyph: { unicode?: string }) => glyph?.unicode === "→")
				: [],
		);
		expect(arrows).toHaveLength(3);
		for (const arrow of arrows) {
			expect(arrow.isInFont).toBe(true);
			expect(arrow.width).toBeGreaterThan(0);
		}
	} finally {
		await task.destroy();
	}
});
