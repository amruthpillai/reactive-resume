import { describe, expect, it } from "vitest";
import {
	baseTemplateAccentColors,
	baseTemplateIds,
	getTemplateAccentColor,
	templateSchema,
	templateVariantFamilies,
} from "./templates";

describe("templateSchema", () => {
	it("accepts known template names", () => {
		const validTemplates = [...baseTemplateIds, "ditto-ats-classic", "scizor-executive", "meowth-international"];
		for (const t of validTemplates) {
			expect(templateSchema.safeParse(t).success).toBe(true);
		}
	});

	it("rejects unknown template names", () => {
		expect(templateSchema.safeParse("unknown").success).toBe(false);
		expect(templateSchema.safeParse("").success).toBe(false);
		expect(templateSchema.safeParse("ONYX").success).toBe(false); // case-sensitive
	});

	it("rejects non-string values", () => {
		expect(templateSchema.safeParse(null).success).toBe(false);
		expect(templateSchema.safeParse(undefined).success).toBe(false);
		expect(templateSchema.safeParse(42).success).toBe(false);
	});

	it("returns the exact value for a valid template", () => {
		const result = templateSchema.safeParse("onyx");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("onyx");
		}
	});

	it("includes the base templates plus all generated professional variants", () => {
		const validTemplates = templateSchema.options;
		expect(validTemplates).toHaveLength(baseTemplateIds.length * (templateVariantFamilies.length + 1));
		expect(validTemplates.length).toBeGreaterThanOrEqual(250);
	});

	it("maps every template to a primary accent color", () => {
		expect(Object.keys(baseTemplateAccentColors).sort()).toEqual([...baseTemplateIds].sort());
		expect(getTemplateAccentColor("leafish")).toBe(baseTemplateAccentColors.leafish);
		expect(getTemplateAccentColor("leafish-healthcare")).toBe(baseTemplateAccentColors.leafish);
	});
});
