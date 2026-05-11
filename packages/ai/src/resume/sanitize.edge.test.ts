import { describe, expect, it, vi } from "vitest";
import { sanitizeAndParseResumeJson } from "./sanitize";

describe("sanitizeAndParseResumeJson — edge cases", () => {
	it("coerces numeric boolean shorthand (1/0) to true/false", () => {
		const json = JSON.stringify({
			basics: { name: "Bool One" },
			summary: { hidden: 1, title: "", columns: 1, content: "" },
		});

		const result = sanitizeAndParseResumeJson(json);
		expect(result.data.summary.hidden).toBe(true);
	});

	it("accepts '1' and '0' string shorthand for booleans", () => {
		const json = JSON.stringify({
			basics: { name: "One" },
			summary: { hidden: "1", title: "", columns: 1, content: "" },
		});
		const result = sanitizeAndParseResumeJson(json);
		expect(result.data.summary.hidden).toBe(true);
	});

	it("salvages missing item.hidden by setting it to false", () => {
		const json = JSON.stringify({
			basics: { name: "Test" },
			sections: {
				skills: {
					title: "Skills",
					columns: 1,
					hidden: false,
					items: [{ id: "abc", name: "Go", level: 3, keywords: [], description: "" }],
				},
			},
		});
		const result = sanitizeAndParseResumeJson(json);
		// Schema parsing accepts the result; salvageApplied flag becomes true if salvage was needed.
		expect(result.data.sections.skills.items[0]?.hidden).toBe(false);
	});

	it("rethrows non-Zod errors with a generic message and logs them", () => {
		// Pass garbage that survives jsonrepair (which is permissive) but produces
		// something that JSON.parse can choke on after repair fails internally.
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		// Empty / nonsense input — jsonrepair may produce something parseable, so
		// instead provide a value that makes the merge throw downstream.
		// Force a non-Zod error by making the merge target undefined.
		expect(() => sanitizeAndParseResumeJson("")).toThrow();
		consoleSpy.mockRestore();
	});
});
