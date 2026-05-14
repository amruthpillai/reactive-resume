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

function pointerExists(document: unknown, pointer: string): boolean {
	if (pointer === "") return true;
	if (!pointer.startsWith("/")) return false;

	const segments = pointer.slice(1).split("/").map(decodePointerSegment);
	let current: unknown = document;
	for (const segment of segments) {
		if (current == null || typeof current !== "object") return false;
		const record = current as Record<string, unknown>;
		if (!Object.hasOwn(record, segment)) return false;
		current = record[segment];
	}
	return true;
}

function getParentPointer(pointer: string) {
	const lastSlashIndex = pointer.lastIndexOf("/");
	return lastSlashIndex <= 0 ? "" : pointer.slice(0, lastSlashIndex);
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
			const parent = readPointer(working, getParentPointer(operation.path));

			// JSON Patch "add" inserts into arrays, but overwrites existing object members.
			// Array inserts must be reverted with remove; object overwrites need replace.
			if (Array.isArray(parent)) {
				inverse.unshift({ op: "remove", path: operation.path });
			} else if (pointerExists(working, operation.path)) {
				inverse.unshift({
					op: "replace",
					path: operation.path,
					value: cloneJson(readPointer(working, operation.path)),
				});
			} else {
				inverse.unshift({ op: "remove", path: operation.path });
			}
		} else {
			throw new Error("INVERTIBLE_PATCH_REQUIRED");
		}

		applyResumePatches(working, [operation]);
	}

	return inverse;
}
