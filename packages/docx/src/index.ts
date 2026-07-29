import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { SectionTitleResolver } from "./builder";
import { Packer } from "docx";
import { assertResumeData } from "@reactive-resume/schema/resume/data";
import { buildDocument } from "./builder";

/**
 * Builds a DOCX file from resume data and returns it as a Blob. Pass `resolveTitle` to fill in
 * locale-aware section headings (titles are stored empty and resolved at render time).
 */
// biome-ignore lint/suspicious/useAwait: keep synchronous renderer errors on the public Promise rejection path.
export async function buildDocx(data: ResumeData, resolveTitle?: SectionTitleResolver): Promise<Blob> {
	assertResumeData(data);
	const doc = buildDocument(data, resolveTitle);
	return Packer.toBlob(doc);
}
