/// <reference lib="webworker" />

import type { PdfPreflightFailure } from "@reactive-resume/pdf/preflight";
import type {
	PreflightWorkerError,
	PreflightWorkerRequest,
	PreflightWorkerResponse,
	SerializedPreflightCause,
} from "./protocol";
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

const sanitizeWorkerCause = (cause: unknown): string => {
	if (!(cause instanceof Error)) return "The PDF preflight worker failed.";
	const detail = cause.message.replace(/\s+/g, " ").trim().slice(0, 200);
	if (!detail) return "The PDF preflight worker failed.";
	return `The PDF preflight worker failed. (${cause.name}: ${detail})`;
};

const serializeZodCause = (cause: unknown): SerializedPreflightCause | undefined => {
	if (!(cause instanceof Error) || cause.name !== "ZodError" || !("issues" in cause) || !Array.isArray(cause.issues)) {
		return;
	}
	return { name: cause.name, message: cause.message, issues: cause.issues };
};

const initialization = Promise.all([import("@reactive-resume/pdf/preflight"), initializePdfInspection()] as const);
void initialization.then(() => self.postMessage({ type: "preflight_ready" }));

self.addEventListener("message", async ({ data }: MessageEvent<PreflightWorkerRequest>) => {
	if (data.type !== "preflight") return;
	const [{ renderPreflightPdf }] = await initialization;
	let rendered: Awaited<ReturnType<typeof renderPreflightPdf>>;

	try {
		rendered = await renderPreflightPdf(data.input, data.limits);
	} catch (cause) {
		const serializedCause = serializeZodCause(cause);
		if (serializedCause) {
			const response: PreflightWorkerError = {
				type: "preflight_error",
				requestId: data.requestId,
				editGeneration: data.editGeneration,
				cause: serializedCause,
			};
			self.postMessage(response);
			return;
		}
		const result = failure("STYLESHEET_PREFLIGHT_WORKER_FAILED", sanitizeWorkerCause(cause));
		const response: PreflightWorkerResponse = {
			type: "preflight_result",
			requestId: data.requestId,
			editGeneration: data.editGeneration,
			result,
		};
		self.postMessage(response);
		return;
	}

	let result: PreflightWorkerResponse["result"];
	if (!rendered.ok) {
		result = rendered;
	} else if (rendered.bytes.byteLength > data.limits.maxBytes) {
		result = failure("STYLESHEET_PREFLIGHT_BYTE_LIMIT", "The PDF exceeds the preflight byte limit.");
	} else {
		try {
			const pdf = Uint8Array.from(rendered.bytes).buffer;
			const pageCount = await inspectPdfPageCount(pdf);
			result =
				pageCount > data.limits.maxPages
					? failure("STYLESHEET_PREFLIGHT_PAGE_LIMIT", "The PDF exceeds the preflight page limit.")
					: {
							ok: true,
							pageCount,
							byteCount: pdf.byteLength,
							diagnostics: rendered.diagnostics,
							pdf,
						};
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
