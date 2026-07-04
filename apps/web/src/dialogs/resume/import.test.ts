import { describe, expect, it } from "vitest";
import { detectJsonImportType } from "./import";

describe("detectJsonImportType", () => {
	it("detects JSON Resume by a top-level basics without Reactive Resume sections/metadata", () => {
		expect(detectJsonImportType({ basics: { name: "A" }, work: [] })).toBe("json-resume-json");
	});

	it("detects the current Reactive Resume schema by metadata.page", () => {
		expect(detectJsonImportType({ basics: {}, sections: {}, metadata: { page: { locale: "en-US" } } })).toBe(
			"reactive-resume-json",
		);
	});

	it("detects the legacy v4 schema by metadata without a page key", () => {
		expect(detectJsonImportType({ basics: {}, sections: {}, metadata: { template: "azurill" } })).toBe(
			"reactive-resume-v4-json",
		);
	});

	it("returns an empty string for unrecognized shapes", () => {
		expect(detectJsonImportType({ foo: "bar" })).toBe("");
		expect(detectJsonImportType(null)).toBe("");
		expect(detectJsonImportType("nope")).toBe("");
	});
});
