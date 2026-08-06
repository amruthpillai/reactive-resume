import { describe, expect, it } from "vitest";
import z from "zod";
import { sectionTypeSchema } from "./data";
import { defaultResumeData } from "./default";
import { createCustomSectionItemJsonSchemas, createResumeDataJsonSchema } from "./json-schema";

describe("createResumeDataJsonSchema", () => {
	it("describes accepted ResumeData input even when the Zod schema contains transforms", () => {
		const schema = createResumeDataJsonSchema();

		expect(schema).toMatchObject({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "object",
			required: ["picture", "basics", "summary", "sections", "customSections", "metadata"],
			properties: {
				picture: { type: "object" },
				basics: { type: "object" },
				sections: { type: "object" },
				metadata: { type: "object" },
			},
		});
	});

	it("enforces the custom-section type and item correlation", () => {
		const generatedSchema = z.fromJSONSchema(createResumeDataJsonSchema());
		const valid = {
			...defaultResumeData,
			customSections: [
				{
					id: "custom-summary",
					type: "summary",
					title: "Summary",
					icon: "",
					columns: 1,
					hidden: false,
					keepTogether: false,
					startOnNewPage: false,
					items: [{ id: "summary-item", hidden: false, content: "<p>Summary</p>" }],
				},
			],
		};
		const mismatched = {
			...valid,
			customSections: valid.customSections.map((section) => ({ ...section, type: "experience" })),
		};

		expect(generatedSchema.safeParse(valid).success).toBe(true);
		expect(generatedSchema.safeParse(mismatched).success).toBe(false);
	});
});

describe("createCustomSectionItemJsonSchemas", () => {
	it("emits every type-keyed item schema with representative required shapes", () => {
		const schemas = createCustomSectionItemJsonSchemas();

		expect(Object.keys(schemas)).toEqual(sectionTypeSchema.options);
		expect(schemas.summary).toMatchObject({
			schemaName: "summaryItemSchema",
			schema: { required: ["id", "hidden", "content"] },
		});
		expect(schemas.experience).toMatchObject({
			schemaName: "experienceItemSchema",
			schema: {
				required: ["id", "hidden", "company", "position", "location", "period", "description"],
			},
		});
		expect(schemas["cover-letter"]).toMatchObject({
			schemaName: "coverLetterItemSchema",
			schema: { required: ["id", "hidden", "recipient", "content"] },
		});
	});
});
