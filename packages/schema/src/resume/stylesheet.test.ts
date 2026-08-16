import { describe, expect, it } from "vitest";
import { resumeDataSchema } from "./data";
import { defaultResumeData } from "./default";
import { semanticStylesheetSchema, stylesheetSourceSchema } from "./stylesheet";

describe("semanticStylesheetSchema", () => {
	it("persists one canonical stylesheet source", () => {
		const result = semanticStylesheetSchema.parse({
			mode: "semantic",
			source: { languageVersion: 1, text: "@version 1;\nsection { color: red; }\n" },
		});

		expect(result).toEqual({
			mode: "semantic",
			source: { languageVersion: 1, text: "@version 1;\nsection { color: red; }\n" },
		});
	});

	it("normalizes the historical applied source to the canonical source-only shape", () => {
		const source = { languageVersion: 1, text: "@version 1;\nname { color: red; }\n" };
		const result = semanticStylesheetSchema.parse({
			mode: "semantic",
			source,
			applied: { languageVersion: 1, text: "@version 1;\nname { color: blue; }\n" },
		});

		expect(result).toEqual({ mode: "semantic", source });
	});

	it("keeps resumes without a stylesheet valid for legacy rendering", () => {
		expect(resumeDataSchema.parse(defaultResumeData).metadata.stylesheet).toBeUndefined();
	});

	it("rejects non-positive language versions", () => {
		expect(
			semanticStylesheetSchema.safeParse({
				mode: "semantic",
				source: { languageVersion: 0, text: "" },
			}).success,
		).toBe(false);
	});

	it("rejects unknown stylesheet fields", () => {
		expect(
			semanticStylesheetSchema.safeParse({
				mode: "semantic",
				source: { languageVersion: 1, text: "" },
				unknown: true,
			}).success,
		).toBe(false);
	});

	it("rejects unknown stylesheet source fields", () => {
		expect(stylesheetSourceSchema.safeParse({ languageVersion: 1, text: "", unknown: true }).success).toBe(false);
	});
});
