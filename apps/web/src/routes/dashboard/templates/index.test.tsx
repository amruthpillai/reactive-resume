import { describe, expect, it } from "vitest";
import { searchSchema } from "./index";

describe("/dashboard/templates searchSchema", () => {
	it("accepts empty object with defaults", () => {
		const result = searchSchema.parse({});
		expect(result.resume).toBeUndefined();
	});

	it("accepts a resume id string", () => {
		const result = searchSchema.parse({ resume: "abc123" });
		expect(result.resume).toBe("abc123");
	});
});
