import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { t } from "@lingui/core/macro";
import { Directory, File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { getResumeExportData } from "@reactive-resume/resume/export-sections";
import { safeFileName } from "./model";
import { rest } from "@/api/client";
import { createPreviewPipeline } from "@/preview/pipeline";

export type ExportFormat = "pdf" | "docx" | "odt" | "md" | "json";
const mime = {
	pdf: "application/pdf",
	docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	odt: "application/vnd.oasis.opendocument.text",
	md: "text/markdown",
	json: "application/json",
};

/** Only sweep old task-owned batches. Android recipients can read files after the share promise resolves. */
export function exportDirectory() {
	for (const entry of Paths.cache.list()) {
		if (entry instanceof Directory && /^resume-export-\d+$/.test(entry.name)) {
			const created = Number(entry.name.slice("resume-export-".length));
			if (Date.now() - created > 24 * 60 * 60 * 1000) {
				try {
					entry.delete();
				} catch {
					/* Cache cleanup must not block a new export. */
				}
			}
		}
	}
	const directory = new Directory(Paths.cache, `resume-export-${Date.now()}`);
	directory.create({ intermediates: true, idempotent: true });
	return directory;
}

export async function localPdf(data: ResumeData, letter = false) {
	const pipeline = createPreviewPipeline();
	try {
		const result = await pipeline.render({
			id: 1,
			data: getResumeExportData(data, letter ? "cover-letter" : "resume"),
			scale: 1,
			pages: [],
			renderOptions: { includeCoverLetterHeader: letter },
		});
		if (result.hasTextLoss || result.lostCharacters.length) {
			throw new Error(t`Some text couldn't be rendered. Review the Page before downloading.`);
		}
		return result.pdf;
	} finally {
		await pipeline.dispose();
	}
}

type ExportFileOptions = {
	directory: Directory;
	id: string;
	name: string;
	format: ExportFormat;
	data?: ResumeData;
	letter?: boolean;
};

export async function exportFile({ directory, id, name, format, data, letter }: ExportFileOptions) {
	let bytes: Uint8Array;
	if (format === "pdf" && data) bytes = await localPdf(data, letter);
	else {
		const response = await rest(`/${letter ? "cover-letters" : "resumes"}/${encodeURIComponent(id)}/exports/${format}`);
		if (!response.ok) throw new Error(t`Couldn't generate this file. Try again, or download PDF instead.`);
		bytes = new Uint8Array(await response.arrayBuffer());
	}
	const file = new File(directory, `${safeFileName(name) || "document"}.${format}`);
	await file.write(bytes);
	return file;
}

export async function shareExport(file: File, format: ExportFormat) {
	if (!(await Sharing.isAvailableAsync())) throw new Error(t`File sharing is unavailable on this device.`);
	await Sharing.shareAsync(file.uri, { mimeType: mime[format], dialogTitle: t`Save or share file` });
}

export async function printResume(data: ResumeData, name: string) {
	const file = new File(exportDirectory(), `${safeFileName(name) || "resume"}.pdf`);
	await file.write(await localPdf(data));
	await Print.printAsync({ uri: file.uri });
}
