import { describe, expect, it } from "vitest";
import { baseTemplateIds, templateIds } from "@reactive-resume/schema/templates";
import { baseTemplates, templates } from "./data";

describe("templates metadata", () => {
	const entries = Object.entries(templates);

	it("declares the expected template ids", () => {
		const ids = Object.keys(templates).sort();
		expect(ids).toEqual([...templateIds].sort());
		expect(ids.length).toBeGreaterThanOrEqual(250);
	});

	it("provides a name, description, image, and tags for every template", () => {
		for (const [id, meta] of entries) {
			expect(meta.name, id).toBeTruthy();
			expect(meta.description, id).toBeDefined();
			expect(meta.imageUrl, id).toMatch(/^\/templates\//);
			expect(meta.accentColor, id).toMatch(/^rgba\(\d+, \d+, \d+, 1\)$/);
			expect(Array.isArray(meta.tags), id).toBe(true);
			expect(meta.tags.length, id).toBeGreaterThan(0);
			expect(baseTemplateIds).toContain(meta.baseTemplate);
		}
	});

	it("uses a recognized sidebar position for every template", () => {
		const validPositions = new Set(["left", "right", "none"]);
		for (const [id, meta] of entries) {
			expect(validPositions.has(meta.sidebarPosition), `${id}: ${meta.sidebarPosition}`).toBe(true);
		}
	});

	it("reuses the base template preview image for generated variants", () => {
		const variant = templates["scizor-executive"];
		expect(variant.imageUrl).toBe(baseTemplates.scizor.imageUrl);
		expect(variant.accentColor).toBe(baseTemplates.scizor.accentColor);
		expect(variant.isVariant).toBe(true);
	});

	it("uses lowercase ids and display names for every template", () => {
		for (const [id, meta] of entries) {
			expect(id).toBe(id.toLowerCase());
			expect(meta.name).toBeTruthy();
		}
	});
});
