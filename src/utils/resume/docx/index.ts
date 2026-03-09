import type { ResumeData } from "@/schema/resume/data";

/**
 * Builds a DOCX file from resume data and returns it as a Blob.
 *
 * Uses dynamic imports to lazy-load the `docx` package (~200KB gzipped)
 * so it's only downloaded when the user actually clicks the DOCX export button.
 */
export async function buildDocx(data: ResumeData): Promise<Blob> {
	const { buildDocument } = await import("./builder");
	const { Packer } = await import("docx");
	const doc = buildDocument(data);
	return Packer.toBlob(doc);
}
