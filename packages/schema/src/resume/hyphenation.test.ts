import { describe, expect, it } from "vitest";
import { typographySchema } from "./data";
import { sampleResumeData } from "./sample";

describe("hyphenation preference", () => {
	it.each([true, false])("preserves the explicit %s preference", (hyphenation) => {
		const parsed = typographySchema.parse({ ...sampleResumeData.metadata.typography, hyphenation });
		expect(parsed.hyphenation).toBe(hyphenation);
	});

	it("keeps older typography data unchanged with hyphenation disabled by default", () => {
		const parsed = typographySchema.parse(sampleResumeData.metadata.typography);
		expect(parsed.hyphenation ?? false).toBe(false);
		expect(parsed).toEqual(sampleResumeData.metadata.typography);
	});

	it("rejects a non-boolean preference", () => {
		expect(typographySchema.safeParse({ ...sampleResumeData.metadata.typography, hyphenation: "true" }).success).toBe(
			false,
		);
	});
});
