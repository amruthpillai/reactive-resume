import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { applyResumePatches, createResumePatches, jsonPatchOperationSchema, ResumePatchError } from "./patch";

describe("jsonPatchOperationSchema", () => {
	it("validates add op", () => {
		const result = jsonPatchOperationSchema.safeParse({ op: "add", path: "/foo", value: 1 });
		expect(result.success).toBe(true);
	});

	it("requires value for add", () => {
		const result = jsonPatchOperationSchema.safeParse({ op: "add", path: "/foo" });
		expect(result.success).toBe(false);
	});

	it("validates remove op without value", () => {
		const result = jsonPatchOperationSchema.safeParse({ op: "remove", path: "/foo" });
		expect(result.success).toBe(true);
	});

	it("validates replace op", () => {
		const result = jsonPatchOperationSchema.safeParse({ op: "replace", path: "/foo", value: 2 });
		expect(result.success).toBe(true);
	});

	it("validates move op with from", () => {
		const result = jsonPatchOperationSchema.safeParse({ op: "move", path: "/a", from: "/b" });
		expect(result.success).toBe(true);
	});

	it("requires from for move", () => {
		const result = jsonPatchOperationSchema.safeParse({ op: "move", path: "/a" });
		expect(result.success).toBe(false);
	});

	it("validates copy op with from", () => {
		const result = jsonPatchOperationSchema.safeParse({ op: "copy", path: "/a", from: "/b" });
		expect(result.success).toBe(true);
	});

	it("validates test op with value", () => {
		const result = jsonPatchOperationSchema.safeParse({ op: "test", path: "/a", value: 1 });
		expect(result.success).toBe(true);
	});

	it("rejects unknown op", () => {
		const result = jsonPatchOperationSchema.safeParse({ op: "swap", path: "/a", value: 1 });
		expect(result.success).toBe(false);
	});

	it("permits any value type for add (unknown)", () => {
		const result = jsonPatchOperationSchema.safeParse({ op: "add", path: "/x", value: { nested: { array: [1] } } });
		expect(result.success).toBe(true);
	});
});

describe("createResumePatches", () => {
	it("returns empty array when documents are equal", () => {
		const patches = createResumePatches(defaultResumeData, defaultResumeData);
		expect(patches).toEqual([]);
	});

	it("emits a replace op when a scalar field changes", () => {
		const next = { ...defaultResumeData, basics: { ...defaultResumeData.basics, name: "Alice" } };
		const patches = createResumePatches(defaultResumeData, next);

		expect(patches.some((p) => p.op === "replace" && p.path === "/basics/name")).toBe(true);
	});

	it("captures multiple changes in distinct operations", () => {
		const next = {
			...defaultResumeData,
			basics: { ...defaultResumeData.basics, name: "Alice", email: "alice@example.com" },
		};
		const patches = createResumePatches(defaultResumeData, next);

		expect(patches.length).toBeGreaterThanOrEqual(2);
	});
});

describe("applyResumePatches", () => {
	it("applies a single replace op", () => {
		const result = applyResumePatches(defaultResumeData, [{ op: "replace", path: "/basics/name", value: "Alice" }]);

		expect(result.basics.name).toBe("Alice");
		// Original is preserved (not mutated)
		expect(defaultResumeData.basics.name).toBe("");
	});

	it("does not mutate the input data", () => {
		const before = JSON.stringify(defaultResumeData);
		applyResumePatches(defaultResumeData, [{ op: "replace", path: "/basics/name", value: "Bob" }]);
		expect(JSON.stringify(defaultResumeData)).toBe(before);
	});

	it("applies multiple ops in sequence", () => {
		const result = applyResumePatches(defaultResumeData, [
			{ op: "replace", path: "/basics/name", value: "Alice" },
			{ op: "replace", path: "/basics/email", value: "alice@example.com" },
		]);

		expect(result.basics.name).toBe("Alice");
		expect(result.basics.email).toBe("alice@example.com");
	});

	it("throws ResumePatchError for unresolvable path", () => {
		expect(() =>
			applyResumePatches(defaultResumeData, [{ op: "replace", path: "/does/not/exist", value: "x" }]),
		).toThrow(ResumePatchError);
	});

	it("throws ResumePatchError for failed test op", () => {
		try {
			applyResumePatches(defaultResumeData, [{ op: "test", path: "/basics/name", value: "wrong-value" }]);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(ResumePatchError);
			const patchError = error as ResumePatchError;
			expect(patchError.code).toBe("TEST_OPERATION_FAILED");
			expect(patchError.index).toBe(0);
			expect(patchError.message).toContain("Test operation failed");
		}
	});

	it("includes the failing operation in the error", () => {
		try {
			applyResumePatches(defaultResumeData, [{ op: "test", path: "/basics/name", value: "wrong" }]);
			expect.unreachable();
		} catch (error) {
			expect((error as ResumePatchError).operation).toEqual({
				op: "test",
				path: "/basics/name",
				value: "wrong",
			});
		}
	});

	it("rolls back if patched document fails schema validation", () => {
		// Setting picture.size to a value outside schema bounds (min 32, max 512)
		expect(() =>
			applyResumePatches(defaultResumeData, [{ op: "replace", path: "/picture/size", value: 9999 }]),
		).toThrow(/Patch produced invalid resume data/);
	});

	it("supports adding to arrays", () => {
		const result = applyResumePatches(defaultResumeData, [
			{
				op: "add",
				path: "/sections/skills/items/-",
				value: {
					id: "abcdef0123456789",
					hidden: false,
					icon: "",
					iconColor: "",
					name: "TypeScript",
					proficiency: "Advanced",
					level: 4,
					keywords: [],
				},
			},
		]);

		expect(result.sections.skills.items).toHaveLength(1);
		expect(result.sections.skills.items[0]?.name).toBe("TypeScript");
	});

	it("supports remove operation on existing path", () => {
		// First add an item, then remove it
		const withItem = applyResumePatches(defaultResumeData, [
			{
				op: "add",
				path: "/sections/skills/items/-",
				value: {
					id: "abcdef0123456789",
					hidden: false,
					icon: "",
					iconColor: "",
					name: "Go",
					proficiency: "Advanced",
					level: 4,
					keywords: [],
				},
			},
		]);

		const removed = applyResumePatches(withItem, [{ op: "remove", path: "/sections/skills/items/0" }]);
		expect(removed.sections.skills.items).toHaveLength(0);
	});
});

describe("ResumePatchError", () => {
	it("captures all expected properties", () => {
		const error = new ResumePatchError("CODE", "msg", 2, { op: "test", path: "/x", value: 1 });
		expect(error.name).toBe("ResumePatchError");
		expect(error.code).toBe("CODE");
		expect(error.message).toBe("msg");
		expect(error.index).toBe(2);
		expect(error.operation).toEqual({ op: "test", path: "/x", value: 1 });
	});

	it("is instanceof Error", () => {
		const error = new ResumePatchError("X", "y", 0, { op: "remove", path: "/x" });
		expect(error).toBeInstanceOf(Error);
	});
});
