import { describe, expect, it } from "vitest";
import { resumeDataSchema } from "./data";
import { defaultResumeData } from "./default";
import { semanticStylesheetSchema } from "./stylesheet";

describe("semanticStylesheetSchema", () => {
	it("preserves separate editable and applied sources", () => {
		const result = semanticStylesheetSchema.parse({
			mode: "semantic",
			source: { languageVersion: 1, text: "@rr-version 1;\nsection {" },
			applied: { languageVersion: 1, text: "@rr-version 1;\nsection { color: red; }\n" },
		});

		expect(result.source.text).toContain("section {");
		expect(result.applied.text).toContain("color: red");
	});

	it("keeps resumes without a stylesheet valid for legacy rendering", () => {
		expect(resumeDataSchema.parse(defaultResumeData).metadata.stylesheet).toBeUndefined();
	});

	it("rejects non-positive language versions", () => {
		expect(
			semanticStylesheetSchema.safeParse({
				mode: "semantic",
				source: { languageVersion: 0, text: "" },
				applied: { languageVersion: 1, text: "" },
			}).success,
		).toBe(false);
	});
});
