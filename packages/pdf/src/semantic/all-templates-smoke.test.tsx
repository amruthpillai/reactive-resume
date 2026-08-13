import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { templateSchema } from "@reactive-resume/schema/templates";
import { ResumeDocument } from "../document";
import { buildAllTemplatesFixture } from "./all-templates-fixture";

describe("Semantic CSS all-template smoke", () => {
	it.each(templateSchema.options)(
		"renders %s with the comprehensive stylesheet",
		async (template) => {
			const element = createElement(ResumeDocument, {
				data: buildAllTemplatesFixture(template),
				template,
			}) as unknown as Parameters<typeof renderToBuffer>[0];
			const output = await renderToBuffer(element);

			expect(output.byteLength).toBeGreaterThan(1_000);
			expect(output.subarray(0, 4).toString()).toBe("%PDF");
		},
		30_000,
	);
});
