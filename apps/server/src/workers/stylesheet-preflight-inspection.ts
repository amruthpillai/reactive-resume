import type { PdfPreflightPageLimits, PdfPreflightResult, RenderPreflightPdfResult } from "@reactive-resume/pdf/server";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

type StylesheetPreflightInspectionLimits = PdfPreflightPageLimits & {
	maxPages: number;
	maxBytes: number;
};

type PdfLoadingTask = {
	promise: PromiseLike<{ numPages: number }>;
	destroy(): Promise<void>;
};

type LoadPdf = (options: { data: Uint8Array }) => PdfLoadingTask;

export async function inspectPreflightPdf(
	rendered: Extract<RenderPreflightPdfResult, { ok: true }>,
	limits: StylesheetPreflightInspectionLimits,
	loadPdf: LoadPdf = getDocument,
): Promise<PdfPreflightResult> {
	if (rendered.bytes.byteLength > limits.maxBytes) {
		return {
			ok: false,
			code: "STYLESHEET_PREFLIGHT_BYTE_LIMIT",
			message: "The rendered PDF exceeds the preflight byte limit.",
			diagnostics: rendered.diagnostics,
		};
	}

	const byteCount = rendered.bytes.byteLength;
	let loadingTask: PdfLoadingTask;
	try {
		loadingTask = loadPdf({ data: rendered.bytes });
	} catch {
		return {
			ok: false,
			code: "STYLESHEET_PREFLIGHT_PARSE_FAILED",
			message: "PDF inspection failed.",
			diagnostics: rendered.diagnostics,
		};
	}

	try {
		let document: { numPages: number };
		try {
			document = await loadingTask.promise;
		} catch {
			return {
				ok: false,
				code: "STYLESHEET_PREFLIGHT_PARSE_FAILED",
				message: "PDF inspection failed.",
				diagnostics: rendered.diagnostics,
			};
		}

		if (document.numPages > limits.maxPages) {
			return {
				ok: false,
				code: "STYLESHEET_PREFLIGHT_PAGE_LIMIT",
				message: "The rendered PDF exceeds the preflight page limit.",
				diagnostics: rendered.diagnostics,
			};
		}

		return {
			ok: true,
			pageCount: document.numPages,
			byteCount,
			diagnostics: rendered.diagnostics,
		};
	} finally {
		await loadingTask.destroy().catch(() => undefined);
	}
}
