import { describe, expect, it } from "vitest";
import { inspectResumePdf } from "@reactive-resume/pdf/semantic";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";

describe("@reactive-resume/pdf/semantic", () => {
	it("falls back to base presentation and preserves fatal source diagnostics", () => {
		const data = structuredClone(sampleResumeData);
		data.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 2, text: "@version 2;" } };

		const inspection = inspectResumePdf({ data });

		expect(inspection.diagnostics).toContainEqual(
			expect.objectContaining({ code: "UNSUPPORTED_VERSION", severity: "error" }),
		);
		expect(inspection.presentation).toEqual({});
	});

	it("keeps valid PDF presentation when a neighboring value is recoverable", () => {
		const data = structuredClone(sampleResumeData);
		data.metadata.stylesheet = {
			mode: "semantic",
			source: {
				languageVersion: 1,
				text: "@version 1; name { color: #123456; opacity: var(--missing); }",
			},
		};

		const inspection = inspectResumePdf({ data });

		expect(inspection.presentation["page-1/region-header/header/name"]?.style?.color).toBe("#123456");
		expect(inspection.diagnostics).toContainEqual(
			expect.objectContaining({ code: "UNRESOLVED_VARIABLE", severity: "error" }),
		);
	});
});
