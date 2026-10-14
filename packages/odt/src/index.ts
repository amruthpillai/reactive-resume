import type { SectionTitleResolver } from "./builder";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { parseResumeData } from "@reactive-resume/schema/resume/data";
import { ODT_MIME_TYPE, buildOdtFiles } from "./builder";
import { createZip } from "./zip";

export type { SectionTitleResolver } from "./builder";

/**
 * Builds an ODT file from resume data and returns it as a Blob. Pass `resolveTitle` to fill in
 * locale-aware section headings (titles are stored empty and resolved at render time).
 */
// oxlint-disable-next-line require-await -- keep synchronous renderer errors on the public Promise rejection path.
export async function buildOdt(data: ResumeData, resolveTitle?: SectionTitleResolver): Promise<Blob> {
	const entries = buildOdtFiles(parseResumeData(data), resolveTitle);
	const bytes = createZip(entries);
	return new Blob([bytes], { type: ODT_MIME_TYPE });
}
