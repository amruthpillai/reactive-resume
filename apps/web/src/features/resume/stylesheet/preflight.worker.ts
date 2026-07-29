/// <reference lib="webworker" />

import type { PdfPreflightFailure } from "@reactive-resume/pdf/preflight";
import type { PreflightWorkerRequest, PreflightWorkerResponse } from "./protocol";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { renderPreflightPdf } from "@reactive-resume/pdf/preflight";
import { getPreflightTransferables } from "./protocol";

GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();

const failure = (code: PdfPreflightFailure["code"], message: string): PdfPreflightFailure => ({
	ok: false,
	code,
	message,
	diagnostics: [],
});

self.addEventListener("message", async ({ data }: MessageEvent<PreflightWorkerRequest>) => {
	if (data.type !== "preflight") return;
	const rendered = await renderPreflightPdf(data.input, data.limits);
	let result: PreflightWorkerResponse["result"];

	if (!rendered.ok) {
		result = rendered;
	} else if (rendered.bytes.byteLength > data.limits.maxBytes) {
		result = failure("STYLESHEET_PREFLIGHT_BYTE_LIMIT", "The PDF exceeds the preflight byte limit.");
	} else {
		try {
			const pdf = Uint8Array.from(rendered.bytes).buffer;
			const loadingTask = getDocument({ data: pdf });
			const document = await loadingTask.promise;
			if (document.numPages > data.limits.maxPages) {
				result = failure("STYLESHEET_PREFLIGHT_PAGE_LIMIT", "The PDF exceeds the preflight page limit.");
			} else {
				result = {
					ok: true,
					pageCount: document.numPages,
					byteCount: pdf.byteLength,
					diagnostics: rendered.diagnostics,
					pdf,
				};
			}
			await loadingTask.destroy();
		} catch {
			result = failure("STYLESHEET_PREFLIGHT_PARSE_FAILED", "The generated PDF could not be inspected.");
		}
	}

	const response: PreflightWorkerResponse = {
		type: "preflight_result",
		requestId: data.requestId,
		editGeneration: data.editGeneration,
		result,
	};
	self.postMessage(response, { transfer: getPreflightTransferables(response) });
});
