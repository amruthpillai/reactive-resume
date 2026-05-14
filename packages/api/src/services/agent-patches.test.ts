import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { JsonPatchOperation } from "@reactive-resume/utils/resume/patch";
import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createInverseResumePatches } from "./agent-patches";

function buildFixture(): ResumeData {
	const clone = JSON.parse(JSON.stringify(defaultResumeData)) as ResumeData;
	clone.basics.name = "Alice";
	clone.basics.email = "alice@example.com";
	clone.basics.customFields = [
		{ id: "field-1", icon: "phosphor", text: "first", link: "" },
		{ id: "field-2", icon: "phosphor", text: "second", link: "" },
	];
	return clone;
}

describe("createInverseResumePatches", () => {
	it("inverts a single replace into a replace back to the original value", () => {
		const data = buildFixture();
		const operations: JsonPatchOperation[] = [{ op: "replace", path: "/basics/name", value: "Bob" }];

		const inverse = createInverseResumePatches(data, operations);

		expect(inverse).toEqual([{ op: "replace", path: "/basics/name", value: "Alice" }]);
	});

	it("inverts a single remove into an add carrying the original value", () => {
		const data = buildFixture();
		const operations: JsonPatchOperation[] = [{ op: "remove", path: "/basics/customFields/0" }];

		const inverse = createInverseResumePatches(data, operations);

		expect(inverse).toEqual([
			{
				op: "add",
				path: "/basics/customFields/0",
				value: { id: "field-1", icon: "phosphor", text: "first", link: "" },
			},
		]);
	});

	it("inverts a single add into a remove at the same path", () => {
		const data = buildFixture();
		const operations: JsonPatchOperation[] = [
			{
				op: "add",
				path: "/basics/customFields/2",
				value: { id: "field-3", icon: "phosphor", text: "third", link: "" },
			},
		];

		const inverse = createInverseResumePatches(data, operations);

		expect(inverse).toEqual([{ op: "remove", path: "/basics/customFields/2" }]);
	});

	it("inverts an array insert at an existing index into a remove at the same path", () => {
		const data = buildFixture();
		const operations: JsonPatchOperation[] = [
			{
				op: "add",
				path: "/basics/customFields/1",
				value: { id: "field-inserted", icon: "phosphor", text: "inserted", link: "" },
			},
		];

		const inverse = createInverseResumePatches(data, operations);

		expect(inverse).toEqual([{ op: "remove", path: "/basics/customFields/1" }]);
	});

	it("composes inverses in reverse order with each original value", () => {
		const data = buildFixture();
		const operations: JsonPatchOperation[] = [
			{ op: "replace", path: "/basics/name", value: "Bob" },
			{ op: "replace", path: "/basics/email", value: "bob@example.com" },
		];

		const inverse = createInverseResumePatches(data, operations);

		expect(inverse).toEqual([
			{ op: "replace", path: "/basics/email", value: "alice@example.com" },
			{ op: "replace", path: "/basics/name", value: "Alice" },
		]);
	});

	it("reads downstream pointers against the working copy after upstream removals", () => {
		// Removing /basics/customFields/1 does not affect /basics/name.
		// The inverse builder reads /basics/name from the working copy after the
		// removal has been applied; that value must still be the original "Alice".
		const data = buildFixture();
		const operations: JsonPatchOperation[] = [
			{ op: "remove", path: "/basics/customFields/1" },
			{ op: "replace", path: "/basics/name", value: "Bob" },
		];

		const inverse = createInverseResumePatches(data, operations);

		expect(inverse).toEqual([
			{ op: "replace", path: "/basics/name", value: "Alice" },
			{
				op: "add",
				path: "/basics/customFields/1",
				value: { id: "field-2", icon: "phosphor", text: "second", link: "" },
			},
		]);
	});

	it("throws INVERTIBLE_PATCH_REQUIRED when a path ends with /- (array append)", () => {
		const data = buildFixture();
		const operations: JsonPatchOperation[] = [
			{ op: "add", path: "/basics/customFields/-", value: { id: "x", icon: "phosphor", text: "x", link: "" } },
		];

		expect(() => createInverseResumePatches(data, operations)).toThrow("INVERTIBLE_PATCH_REQUIRED");
	});

	it("throws INVERTIBLE_PATCH_REQUIRED for move operations", () => {
		const data = buildFixture();
		const operations: JsonPatchOperation[] = [{ op: "move", path: "/basics/email", from: "/basics/name" }];

		expect(() => createInverseResumePatches(data, operations)).toThrow("INVERTIBLE_PATCH_REQUIRED");
	});

	it("throws INVERTIBLE_PATCH_REQUIRED for copy operations", () => {
		const data = buildFixture();
		const operations: JsonPatchOperation[] = [{ op: "copy", path: "/basics/email", from: "/basics/name" }];

		expect(() => createInverseResumePatches(data, operations)).toThrow("INVERTIBLE_PATCH_REQUIRED");
	});

	it("throws INVERTIBLE_PATCH_REQUIRED for test operations", () => {
		const data = buildFixture();
		const operations: JsonPatchOperation[] = [{ op: "test", path: "/basics/name", value: "Alice" }];

		expect(() => createInverseResumePatches(data, operations)).toThrow("INVERTIBLE_PATCH_REQUIRED");
	});

	it("throws INVALID_PATCH_OPERATIONS when reading a non-existent path", () => {
		const data = buildFixture();
		const operations: JsonPatchOperation[] = [{ op: "replace", path: "/does/not/exist", value: "x" }];

		expect(() => createInverseResumePatches(data, operations)).toThrow("INVALID_PATCH_OPERATIONS");
	});

	it("inverts an add at an existing object member into a replace with the prior value", () => {
		const data = buildFixture();
		const operations: JsonPatchOperation[] = [{ op: "add", path: "/basics/name", value: "Bob" }];

		const inverse = createInverseResumePatches(data, operations);

		expect(inverse).toEqual([{ op: "replace", path: "/basics/name", value: "Alice" }]);
	});
});
