import { describe, expect, it } from "vitest";
import type { DraftData } from "@/schema/draft/data";
import { draftDataSchema, urlValueSchema } from "@/schema/draft/data";

/**
 * @remarks
 * Constructs a fully shaped DraftData payload with empty fields, ensuring the schema
 * accepts iterative drafts that may not have content yet.
 *
 * @returns A DraftData-compliant object populated with empty strings and arrays.
 * @see {@link draftDataSchema}
 */
const createEmptyDraftData = (): DraftData => ({
	picture: { url: "" },
	basics: {
		name: "",
		headline: "",
		email: "",
		phone: "",
		location: "",
		website: { label: "", url: "" },
		customFields: [],
	},
	summary: { title: "", content: "" },
	sections: {
		profiles: { title: "", items: [] },
		experience: { title: "", items: [] },
		education: { title: "", items: [] },
		projects: { title: "", items: [] },
		skills: { title: "", items: [] },
		languages: { title: "", items: [] },
		interests: { title: "", items: [] },
		awards: { title: "", items: [] },
		certifications: { title: "", items: [] },
		publications: { title: "", items: [] },
		volunteer: { title: "", items: [] },
		references: { title: "", items: [] },
	},
	customSections: [],
	metadata: { notes: "" },
});

/**
 * @remarks
 * Validates the DraftData schema behavior with intentionally empty values.
 * Ensures required fields exist while content can be blank during drafting.
 *
 * @see {@link draftDataSchema}
 */
describe("draftDataSchema", () => {
	/**
	 * @remarks Confirms that a fully shaped payload with empty strings is accepted.
	 */
	it("accepts empty strings and empty arrays", () => {
		const result = draftDataSchema.safeParse(createEmptyDraftData());
		expect(result.success).toBe(true);
	});

	/**
	 * @remarks Ensures missing top-level keys are rejected to preserve schema shape.
	 */
	it("rejects missing required top-level fields", () => {
		const result = draftDataSchema.safeParse({});
		expect(result.success).toBe(false);
		expect(result.error?.issues.length).toBeGreaterThan(0);
	});
});

/**
 * @remarks
 * Validates the URL value schema accepts both string and URL instance inputs.
 *
 * @see {@link urlValueSchema}
 */
describe("urlValueSchema", () => {
	/**
	 * @remarks Accepts a concrete URL object.
	 */
	it("accepts URL instances", () => {
		const result = urlValueSchema.safeParse(new URL("https://example.com"));
		expect(result.success).toBe(true);
	});

	/**
	 * @remarks Rejects values that are not URL-like.
	 */
	it("rejects non-string, non-URL values", () => {
		const result = urlValueSchema.safeParse(123);
		expect(result.success).toBe(false);
	});
});
