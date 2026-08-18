/**
 * Build the Reactive Resume system-prompt section for one tool namespace.
 * @param serverName - the MCP namespace bridged tools are published under.
 * @returns prompt text naming tools exactly as the model will see them.
 */
export function buildPatchGuide(serverName: string): string {
	const t = (raw: string) => `\`mcp__${serverName}__${raw}\``;

	return [
		"## Reactive Resume",
		"",
		"These tools operate on the user's real, live resumes and job applications. Changes are immediate and visible in their account.",
		"",
		"### Reading before writing",
		"",
		`- Call ${t("list_resumes")} to discover resume IDs. IDs are UUIDs, never titles or slugs.`,
		`- Call ${t("read_resume")} before any edit. Never patch a resume you have not read this session.`,
		`- If a call fails with "not found", re-run ${t("list_resumes")} rather than guessing an ID.`,
		"",
		"### Editing",
		"",
		`- ${t("apply_resume_patch")} takes RFC 6902 JSON Patch operations applied to the resume data document.`,
		`- Construct paths from the resume you already read this session — do not guess. ${t("apply_resume_patch")}'s own tool description ships concrete path examples (for example \`/basics/name\`, \`/sections/experience/items/-\`, \`/sections/experience/items/0/company\`, \`/metadata/template\`); match those shapes.`,
		"- Section entries are arrays of objects, each with its own UUID `id`. Address an existing entry by locating its index from the document you just read; never treat an `id` as an index.",
		"- Prefer one patch with several operations over several single-operation patches. Operations apply in order and the whole patch fails atomically.",
		`- ${t("update_resume")} only changes metadata — name, slug, tags, and public visibility. It cannot touch resume content; use ${t("apply_resume_patch")} for that. No tool replaces an existing resume's content wholesale: ${t("import_resume")} creates a brand-new resume from a full data document, it does not overwrite one you already have.`,
		"",
		"### Locking",
		"",
		`- A locked resume rejects every write. When a call fails because the resume is locked, call ${t("unlock_resume")}, make the change, then call ${t("lock_resume")} to leave the lock as you found it.`,
		"",
		"### Scope",
		"",
		"- Never delete a resume or an application unless the user asked for that specific deletion in this conversation.",
		"- When the user describes a change in prose, restate the concrete edit you are about to make before making it.",
	].join("\n");
}

/** The prompt section for the default `resume` namespace. */
export const PATCH_GUIDE: string = buildPatchGuide("resume");
