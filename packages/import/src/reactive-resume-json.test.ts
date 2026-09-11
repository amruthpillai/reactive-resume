import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { parseReactiveResumeJSON } from "./reactive-resume-json";

describe("parseReactiveResumeJSON", () => {
	it("round-trips the default resume data", () => {
		const result = parseReactiveResumeJSON(JSON.stringify(defaultResumeData));
		expect(result.basics.name).toBe(defaultResumeData.basics.name);
	});

	it("imports a historical applied stylesheet as canonical source-only data", () => {
		const source = { languageVersion: 1, text: "@version 1;\nname { color: red; }\n" };
		const data = {
			...structuredClone(defaultResumeData),
			metadata: {
				...structuredClone(defaultResumeData.metadata),
				stylesheet: {
					mode: "semantic",
					source,
					applied: { languageVersion: 1, text: "@version 1;\nname { color: blue; }\n" },
				},
			},
		};

		expect(parseReactiveResumeJSON(JSON.stringify(data)).metadata.stylesheet).toEqual({ mode: "semantic", source });
	});

	it("throws a JSON-serialised validation error for an invalid object", () => {
		// Missing required top-level fields.
		expect(() => parseReactiveResumeJSON(JSON.stringify({ foo: "bar" }))).toThrow();
	});

	it("throws when the input is not valid JSON", () => {
		expect(() => parseReactiveResumeJSON("not-json")).toThrow();
	});

	it("creates a default layout page when the imported data has no pages", () => {
		const data = structuredClone(defaultResumeData);
		data.metadata.layout.pages = [];

		const result = parseReactiveResumeJSON(JSON.stringify(data));
		expect(result.metadata.layout.pages.length).toBe(1);
		expect(result.metadata.layout.pages[0]?.main.length).toBeGreaterThan(0);
	});

	it("recovers missing built-in sections by appending them to the first page", () => {
		const data = structuredClone(defaultResumeData);
		data.metadata.layout.pages = [
			{
				fullWidth: false,
				main: ["experience"],
				sidebar: ["skills"],
			},
		];

		const result = parseReactiveResumeJSON(JSON.stringify(data));
		const firstPage = result.metadata.layout.pages[0];
		expect(firstPage).toBeDefined();
		const allIds = new Set([...(firstPage?.main ?? []), ...(firstPage?.sidebar ?? [])]);

		// Every built-in section (except cover-letter) ends up somewhere on page 1.
		for (const expected of ["education", "projects", "languages", "awards"]) {
			expect(allIds.has(expected), expected).toBe(true);
		}
		// The originally-placed sections remain where the user put them.
		expect(firstPage?.sidebar).toContain("skills");
		expect(firstPage?.main[0]).toBe("experience");
	});

	it("does not modify the layout when every built-in section is already placed", () => {
		const result = parseReactiveResumeJSON(JSON.stringify(defaultResumeData));
		expect(result.metadata.layout.pages.length).toBe(defaultResumeData.metadata.layout.pages.length);
	});
});
