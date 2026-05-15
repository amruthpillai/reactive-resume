import type { JsonPatchOperation } from "@reactive-resume/resume/patch";
import z from "zod";
import { jsonPatchOperationSchema } from "@reactive-resume/resume/patch";

export const resumePatchOperationsSchema = z
	.array(jsonPatchOperationSchema)
	.min(1)
	.describe("Array of JSON Patch (RFC 6902) operations to apply to the resume");

export const resumePatchOperationsInputSchema = z.object({
	operations: resumePatchOperationsSchema,
});

export type ResumePatchOperationsInput = z.infer<typeof resumePatchOperationsInputSchema>;
export type ResumePatchOperation = JsonPatchOperation;
