import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createResumeData } from "./initial-data";

describe("createResumeData", () => {
	it("seeds one canonical empty stylesheet source", () => {
		expect(createResumeData({}).metadata.stylesheet).toEqual({
			mode: "semantic",
			source: { languageVersion: 1, text: "@version 1;\n" },
		});
	});

	it("clones normal and sample defaults instead of mutating shared data", () => {
		const normal = createResumeData({ locale: "de-DE" });
		const sample = createResumeData({ withSampleData: true, name: "Sample Person", locale: "de-DE" });

		normal.basics.name = "Mutated";
		sample.metadata.page.locale = "en-US";

		expect(defaultResumeData.basics.name).toBe("");
		expect(defaultResumeData.metadata.page.locale).not.toBe("de-DE");
		expect(sample.basics.name).toBe("Sample Person");
	});
});
