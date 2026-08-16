import { describe, expect, it } from "vitest";
import { SEMANTIC_CSS_LIMITS_V1 } from "@reactive-resume/resume/stylesheet";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { parseWritableResumeData } from "./resume-data-validation";

describe("parseWritableResumeData", () => {
	it("rejects stylesheet source above the Semantic CSS byte limit", () => {
		const data = structuredClone(defaultResumeData);
		data.metadata.stylesheet = {
			mode: "semantic",
			source: { languageVersion: 1, text: "x".repeat(SEMANTIC_CSS_LIMITS_V1.maxSourceBytes + 1) },
		};

		expect(() => parseWritableResumeData(data)).toThrowError(
			expect.objectContaining({ code: "BAD_REQUEST", status: 400 }),
		);
	});
});
