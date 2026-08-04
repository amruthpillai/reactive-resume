import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { parseResumeJson } from "./parse-json";

describe("parseResumeJson", () => {
	it("parses a current Reactive Resume export using the preferred format", () => {
		const { format, data } = parseResumeJson(JSON.stringify(defaultResumeData), "reactive-resume-json");
		expect(format).toBe("reactive-resume-json");
		expect(data.basics.name).toBe(defaultResumeData.basics.name);
	});

	it("auto-detects the format when none is preferred", () => {
		const { format } = parseResumeJson(JSON.stringify(defaultResumeData));
		expect(format).toBe("reactive-resume-json");
	});

	it("falls back to the correct format when the preferred guess is wrong", () => {
		// Preferring v4 for a current-format file must not crash; it should fall
		// through to the reactive-resume-json parser and still import successfully.
		const result = parseResumeJson(JSON.stringify(defaultResumeData), "reactive-resume-v4-json");
		expect(result.format).toBe("reactive-resume-json");
		expect(result.data.basics.name).toBe(defaultResumeData.basics.name);
	});

	it("throws a readable error for input that isn't valid JSON", () => {
		expect(() => parseResumeJson("not json at all")).toThrow(/resume/i);
	});
});
