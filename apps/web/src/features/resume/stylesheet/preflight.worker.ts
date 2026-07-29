/// <reference lib="webworker" />

import type { PdfPreflightFailure } from "@reactive-resume/pdf/preflight";
import type { PreflightWorkerRequest, PreflightWorkerResponse } from "./protocol";
import { Buffer } from "buffer";
import { initializePdfInspection, inspectPdfPageCount } from "./pdf-inspection";
import { getPreflightTransferables } from "./protocol";

Object.assign(globalThis, { Buffer });

const failure = (code: PdfPreflightFailure["code"], message: string): PdfPreflightFailure => ({
	ok: false,
	code,
	message,
	diagnostics: [],
});

const initialization = Promise.all([import("@reactive-resume/pdf/preflight"), initializePdfInspection()] as const);
void initialization.then(() => self.postMessage({ type: "preflight_ready" }));

self.addEventListener("message", async ({ data }: MessageEvent<PreflightWorkerRequest>) => {
	if (data.type !== "preflight") return;
	const [{ renderPreflightPdf }] = await initialization;
	const rendered = await renderPreflightPdf(data.input, data.limits);
	let result: PreflightWorkerResponse["result"];

	if (!rendered.ok) {
		result = rendered;
	} else if (rendered.bytes.byteLength > data.limits.maxBytes) {
		result = failure("STYLESHEET_PREFLIGHT_BYTE_LIMIT", "The PDF exceeds the preflight byte limit.");
	} else {
		try {
			const pdf = Uint8Array.from(rendered.bytes).buffer;
			const pageCount = await inspectPdfPageCount(pdf);
			if (pageCount > data.limits.maxPages) {
				result = failure("STYLESHEET_PREFLIGHT_PAGE_LIMIT", "The PDF exceeds the preflight page limit.");
			} else {
				result = {
					ok: true,
					pageCount,
					byteCount: pdf.byteLength,
					diagnostics: rendered.diagnostics,
					pdf,
				};
			}
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
