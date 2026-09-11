import { describe, expect, it } from "vitest";
import z from "zod";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { handleSchemaJson } from "./schema";

describe("handleSchemaJson", () => {
	it("publishes the custom-section type and item correlation", async () => {
		const response = handleSchemaJson();
		const schema = z.fromJSONSchema((await response.json()) as Parameters<typeof z.fromJSONSchema>[0]);
		const mismatched = {
			...defaultResumeData,
			customSections: [
				{
					id: "custom-experience",
					type: "experience",
					title: "Experience",
					icon: "",
					columns: 1,
					hidden: false,
					keepTogether: false,
					startOnNewPage: false,
					items: [{ id: "summary-item", hidden: false, content: "<p>Not an experience item</p>" }],
				},
			],
		};

		expect(schema.safeParse(mismatched).success).toBe(false);
	});
});
