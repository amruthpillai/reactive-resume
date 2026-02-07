import type { JsonPatchError, Operation } from "fast-json-patch";
import jsonpatch from "fast-json-patch";
import { type ResumeData, resumeDataSchema } from "@/schema/resume/data";

export type { Operation };

/**
 * A structured error thrown when a JSON Patch operation fails.
 * Contains only the relevant details -- never the full document tree.
 */
export class ResumePatchError extends Error {
	/** The error code from `fast-json-patch`, e.g. `TEST_OPERATION_FAILED`. */
	code: string;
	/** The zero-based index of the failing operation in the operations array. */
	index: number;
	/** The operation object that caused the failure. */
	operation: Operation;

	constructor(code: string, message: string, index: number, operation: Operation) {
		super(message);
		this.name = "ResumePatchError";
		this.code = code;
		this.index = index;
		this.operation = operation;
	}
}

/**
 * Human-readable messages for each `fast-json-patch` error code.
 * These are returned to the API consumer instead of the raw library output.
 */
const patchErrorMessages: Record<string, string> = {
	SEQUENCE_NOT_AN_ARRAY: "Patch sequence must be an array.",
	OPERATION_NOT_AN_OBJECT: "Operation is not an object.",
	OPERATION_OP_INVALID: "Operation `op` property is not one of the operations defined in RFC 6902.",
	OPERATION_PATH_INVALID: "Operation `path` property is not a valid JSON Pointer string.",
	OPERATION_FROM_REQUIRED: "Operation `from` property is required for `move` and `copy` operations.",
	OPERATION_VALUE_REQUIRED: "Operation `value` property is required for `add`, `replace`, and `test` operations.",
	OPERATION_VALUE_CANNOT_CONTAIN_UNDEFINED:
		"Operation `value` contains an `undefined` value, which is not valid in JSON.",
	OPERATION_PATH_CANNOT_ADD: "Cannot perform an `add` operation at the desired path.",
	OPERATION_PATH_UNRESOLVABLE: "Cannot perform the operation at a path that does not exist.",
	OPERATION_FROM_UNRESOLVABLE: "Cannot perform the operation from a path that does not exist.",
	OPERATION_PATH_ILLEGAL_ARRAY_INDEX: "Array index in path must be an unsigned base-10 integer.",
	OPERATION_VALUE_OUT_OF_BOUNDS: "The specified array index is greater than the number of elements in the array.",
	TEST_OPERATION_FAILED: "Test operation failed -- the value at the given path did not match the expected value.",
};

/**
 * Checks whether an error is a `JsonPatchError` from `fast-json-patch`.
 * The library doesn't export the class directly, so we duck-type it.
 */
function isJsonPatchError(error: unknown): error is JsonPatchError {
	return error instanceof Error && "index" in error && "operation" in error;
}

/**
 * Converts a `JsonPatchError` into a clean `ResumePatchError` that omits the document tree.
 */
function toResumePatchError(error: JsonPatchError): ResumePatchError {
	const code = error.name;
	const message = patchErrorMessages[code] ?? error.message;
	const index = error.index ?? 0;
	const operation = error.operation as Operation;

	return new ResumePatchError(code, message, index, operation);
}

/**
 * Applies an array of JSON Patch (RFC 6902) operations to a `ResumeData` object.
 *
 * This function validates the operations before applying them, then validates the
 * resulting document against the `resumeDataSchema` to ensure the patched data is
 * still a valid resume.
 *
 * The original `data` object is not mutated; a deep clone is created internally.
 *
 * @see https://docs.rxresu.me/guides/using-the-patch-api — for usage examples and API details.
 * @see https://datatracker.ietf.org/doc/html/rfc6902 — JSON Patch specification.
 *
 * @param data - The current resume data to patch.
 * @param operations - An array of JSON Patch operations to apply.
 * @returns The patched and validated `ResumeData` object.
 * @throws {ResumePatchError} If the operations are structurally invalid or target non-existent paths.
 * @throws {ResumePatchError} If a `test` operation does not match.
 * @throws {Error} If the patched document does not conform to the `ResumeData` schema.
 */
export function applyResumePatches(data: ResumeData, operations: Operation[]): ResumeData {
	// Validate operations structurally before applying.
	const validationError = jsonpatch.validate(operations, data);
	if (validationError) throw toResumePatchError(validationError);

	// Apply operations. applyPatch throws on `test` failures.
	let patched: ResumeData;

	try {
		const result = jsonpatch.applyPatch(data, operations, false, false);
		patched = result.newDocument;
	} catch (error: unknown) {
		if (isJsonPatchError(error)) throw toResumePatchError(error);
		throw error;
	}

	// Validate the result still conforms to ResumeData.
	const parsed = resumeDataSchema.safeParse(patched);
	if (!parsed.success) throw new Error(`Patch produced invalid resume data: ${parsed.error.message}`);

	return parsed.data;
}
