import { describe, expect, it } from "vitest";
import { templateSchema } from "./templates";

describe("templateSchema", () => {
	it("accepts known template names", () => {
		const validTemplates = [
			"azurill",
			"bronzor",
			"chikorita",
			"ditgar",
			"ditto",
			"gengar",
			"glalie",
			"kakuna",
			"lapras",
			"leafish",
			"meowth",
			"onyx",
			"pikachu",
			"rhyhorn",
			"scizor",
		];
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

	it("includes 14 templates", () => {
		const validTemplates = templateSchema.options;
		expect(validTemplates).toHaveLength(15);
	});
});
