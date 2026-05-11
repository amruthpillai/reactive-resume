import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { executePatchResume, patchResumeInputSchema } from "./patch-resume";

describe("patchResumeInputSchema", () => {
	it("requires at least one operation", () => {
		expect(patchResumeInputSchema.safeParse({ operations: [] }).success).toBe(false);
	});

	it("accepts a valid replace operation", () => {
		const result = patchResumeInputSchema.safeParse({
			operations: [{ op: "replace", path: "/basics/name", value: "Jane" }],
		});
		expect(result.success).toBe(true);
	});

	it("accepts add and remove operations", () => {
		const result = patchResumeInputSchema.safeParse({
			operations: [
				{ op: "add", path: "/sections/skills/items/-", value: { id: "s1", name: "Go" } },
				{ op: "remove", path: "/sections/skills/items/0" },
			],
		});
		expect(result.success).toBe(true);
	});

	it("rejects unknown op values", () => {
		const result = patchResumeInputSchema.safeParse({
			operations: [{ op: "do-something", path: "/x", value: 1 }],
		});
		expect(result.success).toBe(false);
	});
});

describe("executePatchResume", () => {
	it("returns success and the applied operations on a valid patch", () => {
		const ops = [{ op: "replace" as const, path: "/basics/name", value: "Jane Doe" }];
		const result = executePatchResume(structuredClone(defaultResumeData), ops);

		expect(result.success).toBe(true);
		expect(result.appliedOperations).toEqual(ops);
	});

	it("throws when an operation targets an invalid path", () => {
		const ops = [{ op: "replace" as const, path: "/non/existent/path", value: 1 }];
		expect(() => executePatchResume(structuredClone(defaultResumeData), ops)).toThrow();
	});

	it("supports multi-op patches that touch top-level fields", () => {
		const ops = [
			{ op: "replace" as const, path: "/basics/name", value: "Jane Doe" },
			{ op: "replace" as const, path: "/basics/headline", value: "Senior Engineer" },
		];
		const result = executePatchResume(structuredClone(defaultResumeData), ops);
		expect(result.appliedOperations).toEqual(ops);
	});
});
