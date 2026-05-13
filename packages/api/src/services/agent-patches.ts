import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { JsonPatchOperation } from "@reactive-resume/utils/resume/patch";
import { applyResumePatches } from "@reactive-resume/utils/resume/patch";

function decodePointerSegment(segment: string) {
	return segment.replaceAll("~1", "/").replaceAll("~0", "~");
}

function readPointer(document: unknown, pointer: string): unknown {
	if (pointer === "") return document;
	if (!pointer.startsWith("/")) throw new Error("INVALID_PATCH_OPERATIONS");

	return pointer
		.slice(1)
		.split("/")
		.map(decodePointerSegment)
		.reduce<unknown>((current, segment) => {
			if (current == null || typeof current !== "object") throw new Error("INVALID_PATCH_OPERATIONS");

			return (current as Record<string, unknown>)[segment];
		}, document);
}

function cloneJson<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

export function createInverseResumePatches(data: ResumeData, operations: JsonPatchOperation[]): JsonPatchOperation[] {
	const working = cloneJson(data);
	const inverse: JsonPatchOperation[] = [];

	for (const operation of operations) {
		if (operation.path.endsWith("/-")) throw new Error("INVERTIBLE_PATCH_REQUIRED");

		if (operation.op === "replace") {
			inverse.unshift({ op: "replace", path: operation.path, value: cloneJson(readPointer(working, operation.path)) });
		} else if (operation.op === "remove") {
			inverse.unshift({ op: "add", path: operation.path, value: cloneJson(readPointer(working, operation.path)) });
		} else if (operation.op === "add") {
			inverse.unshift({ op: "remove", path: operation.path });
		} else {
			throw new Error("INVERTIBLE_PATCH_REQUIRED");
		}

		applyResumePatches(working, [operation]);
	}

	return inverse;
}
