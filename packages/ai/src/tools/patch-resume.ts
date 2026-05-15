import type { JsonPatchOperation } from "@reactive-resume/resume/patch";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { applyResumePatches } from "@reactive-resume/resume/patch";
import { resumePatchOperationsInputSchema } from "./resume-tool-contracts";

export const patchResumeInputSchema = resumePatchOperationsInputSchema;

export const patchResumeDescription = `Apply JSON Patch (RFC 6902) operations to modify the user's resume data.
Use this tool whenever the user asks to change, add, or remove content from their resume.
Always generate the minimal set of operations needed. Prefer "replace" for updates, "add" for new content, "remove" for deletions.
Use the special "-" index to append to arrays (e.g. "/sections/experience/items/-").`;

export function executePatchResume(resumeData: ResumeData, operations: JsonPatchOperation[]) {
	// Validates operations structurally and against the schema; throws on invalid
	applyResumePatches(resumeData, operations);
	return { success: true as const, appliedOperations: operations };
}
