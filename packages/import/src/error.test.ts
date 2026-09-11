import { describe, expect, it } from "vitest";
import { z } from "zod";
import { rethrowAsImportError } from "./error";

const makeZodError = () => {
	const result = z.object({ name: z.string() }).safeParse({ name: 123 });
	if (result.success) throw new Error("expected the schema to fail");
	return result.error;
};

describe("rethrowAsImportError", () => {
	it("turns a ZodError into a readable sentence instead of raw JSON", () => {
		let caught: Error | undefined;
		try {
			rethrowAsImportError(makeZodError());
		} catch (error) {
			caught = error as Error;
		}

		expect(caught).toBeInstanceOf(Error);
		// Not a raw JSON.stringify(flattenError(...)) dump.
		expect(caught?.message.startsWith("{")).toBe(false);
		expect(caught?.message).toContain("name");
		expect(caught?.message.toLowerCase()).toContain("resume");
	});

	it("re-throws non-Zod errors unchanged", () => {
		const original = new Error("boom");
		expect(() => rethrowAsImportError(original)).toThrow(original);
	});
});
