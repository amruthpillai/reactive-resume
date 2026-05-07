import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { Packer } from "docx";
import { buildDocument } from "./builder";

/** Builds a DOCX file from resume data and returns it as a Blob. */
export async function buildDocx(data: ResumeData): Promise<Blob> {
	const doc = buildDocument(data);
	return Packer.toBlob(doc);
}
