import { describe, expect, it } from "vitest";
import {
	fontDeclarationSchema,
	parsedTemplateSchema,
	resumeSlotSchema,
	templateMetadataSchema,
	typographySlotSchema,
} from "./template-metadata";

describe("fontDeclarationSchema", () => {
	it("accepts a valid bundled font", () => {
		const result = fontDeclarationSchema.safeParse({
			family: "Playfair Display",
			weights: [400, 700],
			source: "bundled",
			files: { "400": "fonts/playfair-400.woff2", "700": "fonts/playfair-700.woff2" },
		});
		expect(result.success).toBe(true);
	});

	it("accepts a valid google font", () => {
		const result = fontDeclarationSchema.safeParse({
			family: "Inter",
			weights: [400, 600],
			source: "google",
		});
		expect(result.success).toBe(true);
	});

	it("rejects unknown source", () => {
		const result = fontDeclarationSchema.safeParse({
			family: "Inter",
			weights: [400],
			source: "custom",
		});
		expect(result.success).toBe(false);
	});
});

describe("templateMetadataSchema", () => {
	it("accepts a valid metadata object", () => {
		const result = templateMetadataSchema.safeParse({
			id: "khaled",
			name: "Khaled",
			sidebarPosition: "left",
		});
		expect(result.success).toBe(true);
	});

	it("accepts optional fields", () => {
		const result = templateMetadataSchema.safeParse({
			id: "khaled",
			name: "Khaled",
			sidebarPosition: "none",
			author: "Khaled AbuShqear",
			description: "A two-column layout",
			tags: ["Two-column", "Technical"],
			fonts: [{ family: "Inter", weights: [400], source: "google" }],
		});
		expect(result.success).toBe(true);
	});

	it("accepts sidebarPosition either", () => {
		const result = templateMetadataSchema.safeParse({
			id: "khaled",
			name: "Khaled",
			sidebarPosition: "either",
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid sidebarPosition", () => {
		const result = templateMetadataSchema.safeParse({
			id: "khaled",
			name: "Khaled",
			sidebarPosition: "center",
		});
		expect(result.success).toBe(false);
	});
});

describe("resumeSlotSchema", () => {
	it("accepts a valid rich-text slot", () => {
		const result = resumeSlotSchema.safeParse({
			id: "additionalHtml",
			itemType: "experienceItem",
			type: "rich-text",
			label: "Additional section",
		});
		expect(result.success).toBe(true);
	});

	it("accepts all input types", () => {
		for (const type of ["rich-text", "text", "image", "image-list", "url", "toggle"]) {
			const result = resumeSlotSchema.safeParse({
				id: "field",
				itemType: "experienceItem",
				type,
				label: "Field",
			});
			expect(result.success).toBe(true);
		}
	});

	it("defaults required to false", () => {
		const result = resumeSlotSchema.safeParse({
			id: "field",
			itemType: "skillItem",
			type: "text",
			label: "Field",
		});
		expect(result.success).toBe(true);
		expect(result.data?.required).toBe(false);
	});

	it("rejects unknown item type", () => {
		const result = resumeSlotSchema.safeParse({
			id: "field",
			itemType: "unknownItem",
			type: "text",
			label: "Field",
		});
		expect(result.success).toBe(false);
	});
});

describe("typographySlotSchema", () => {
	it("accepts a slot with all fields", () => {
		const result = typographySlotSchema.safeParse({
			id: "name",
			label: "Your name",
			defaultFont: "Playfair Display",
			defaultSize: 28,
			defaultWeight: 700,
			defaultLineHeight: 1.2,
		});
		expect(result.success).toBe(true);
	});

	it("accepts a slot with only required fields", () => {
		const result = typographySlotSchema.safeParse({ id: "caption", label: "Dates & locations" });
		expect(result.success).toBe(true);
	});

	it("rejects a slot without id", () => {
		const result = typographySlotSchema.safeParse({ label: "Body text" });
		expect(result.success).toBe(false);
	});
});

describe("templateMetadataSchema — typography", () => {
	it("accepts metadata with typography slots", () => {
		const result = templateMetadataSchema.safeParse({
			id: "khaled",
			name: "Khaled",
			sidebarPosition: "left",
			typography: [
				{ id: "name", label: "Your name", defaultFont: "Playfair Display", defaultSize: 28 },
				{ id: "body", label: "Body text", defaultSize: 10 },
			],
		});
		expect(result.success).toBe(true);
		expect(result.data?.typography).toHaveLength(2);
	});

	it("defaults typography to empty array when absent", () => {
		const result = templateMetadataSchema.safeParse({
			id: "onyx",
			name: "Onyx",
			sidebarPosition: "none",
		});
		expect(result.success).toBe(true);
		expect(result.data?.typography).toEqual([]);
	});
});

describe("parsedTemplateSchema", () => {
	it("accepts metadata with empty inputs", () => {
		const result = parsedTemplateSchema.safeParse({
			metadata: { id: "onyx", name: "Onyx", sidebarPosition: "none" },
			inputs: [],
			files: { "index.html": "<html></html>" },
		});
		expect(result.success).toBe(true);
	});
});
