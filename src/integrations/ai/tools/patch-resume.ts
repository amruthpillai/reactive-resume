import type { Operation } from "fast-json-patch";
import z from "zod";
import type { ResumeData } from "@/schema/resume/data";
import { applyResumePatches, jsonPatchOperationSchema } from "@/utils/resume/patch";

export const patchResumeInputSchema = z.object({
	operations: z
		.array(jsonPatchOperationSchema)
		.min(1)
		.describe("Array of JSON Patch (RFC 6902) operations to apply to the resume"),
});

export const patchResumeDescription = `Apply JSON Patch (RFC 6902) operations to modify the user's resume data.
Use this tool whenever the user asks to change, add, or remove content from their resume.
Always generate the minimal set of operations needed. Prefer "replace" for updates, "add" for new content, "remove" for deletions.
Use the special "-" index to append to arrays (e.g. "/sections/experience/items/-").`;

export function executePatchResume(resumeData: ResumeData, operations: Operation[]) {
	// Validates operations structurally and against the schema; throws on invalid
	applyResumePatches(resumeData, operations);
	return { success: true as const, appliedOperations: operations };
}
