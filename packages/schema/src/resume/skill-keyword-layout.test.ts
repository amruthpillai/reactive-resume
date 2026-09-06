import { describe, expect, it } from "vitest";
import z from "zod";
import { parseResumeData } from "./data";
import { defaultResumeData } from "./default";
import { createResumeDataJsonSchema } from "./json-schema";

describe("skill keyword presentation", () => {
	it.each([undefined, "invalid", "inline", "list"])(
		"normalizes and round-trips %s for built-in and custom Skills",
		(keywordLayout) => {
			const input = structuredClone(defaultResumeData);
			Object.assign(input.sections.skills, { keywordLayout });
			input.customSections = [{ ...input.sections.skills, id: "custom-skills", type: "skills" }];
			const parsed = parseResumeData(input);
			const expected = keywordLayout === "list" ? "list" : "inline";
			expect(parsed.sections.skills).toHaveProperty("keywordLayout", expected);
			expect(parsed.customSections[0]).toHaveProperty("keywordLayout", expected);
			expect(parseResumeData(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
		},
	);

	it("publishes an optional enum so old JSON and selected modes remain importable", () => {
		const schema = z.fromJSONSchema(createResumeDataJsonSchema());
		const input = JSON.parse(JSON.stringify(defaultResumeData));
		delete input.sections.skills.keywordLayout;
		expect(schema.safeParse(input).success).toBe(true);
		input.sections.skills.keywordLayout = "list";
		expect(schema.safeParse(input).success).toBe(true);
		input.sections.skills.keywordLayout = "invalid";
		expect(schema.safeParse(input).success).toBe(false);
	});
	it("does not retain skill presentation when a custom section changes type", () => {
		const input = structuredClone(defaultResumeData);
		input.customSections = [{ ...input.sections.skills, id: "custom", type: "interests", keywordLayout: "list" }];
		const parsed = parseResumeData(input);
		expect(JSON.stringify(parsed.customSections[0])).not.toContain("keywordLayout");
	});
});
