import { describe, expect, it } from "vitest";
import { createResumeDataJsonSchema } from "./json-schema";

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
});
