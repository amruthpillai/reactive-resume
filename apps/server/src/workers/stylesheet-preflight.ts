import type { PdfPreflightPageLimits, PdfPreflightResult, StylesheetPreflightInput } from "@reactive-resume/pdf/server";
import { parentPort, workerData } from "node:worker_threads";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import * as React from "react";
import { renderPreflightPdf } from "@reactive-resume/pdf/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

type StylesheetPreflightWorkerLimits = PdfPreflightPageLimits & {
	maxPages: number;
	maxBytes: number;
};

type StylesheetPreflightWorkerData = {
	input: StylesheetPreflightInput;
	limits: StylesheetPreflightWorkerLimits;
};

const send = (result: PdfPreflightResult) => {
	parentPort?.postMessage(result);
};

async function run() {
	const { input, limits } = workerData as StylesheetPreflightWorkerData;
	const rendered = await renderPreflightPdf(input, limits);
	if (!rendered.ok) {
		send(rendered);
		return;
	}

	if (rendered.bytes.byteLength > limits.maxBytes) {
		send({
			ok: false,
			code: "STYLESHEET_PREFLIGHT_BYTE_LIMIT",
			message: "The rendered PDF exceeds the preflight byte limit.",
			diagnostics: rendered.diagnostics,
		});
		return;
	}

	const byteCount = rendered.bytes.byteLength;
	const loadingTask = getDocument({ data: rendered.bytes });
	try {
		const document = await loadingTask.promise;
		if (document.numPages > limits.maxPages) {
			send({
				ok: false,
				code: "STYLESHEET_PREFLIGHT_PAGE_LIMIT",
				message: "The rendered PDF exceeds the preflight page limit.",
				diagnostics: rendered.diagnostics,
			});
			return;
		}

		send({
			ok: true,
			pageCount: document.numPages,
			byteCount,
			diagnostics: rendered.diagnostics,
		});
	} finally {
		await loadingTask.destroy().catch(() => undefined);
	}
}

void run().catch((error: unknown) => {
	send({
		ok: false,
		code: "STYLESHEET_PREFLIGHT_RENDER_FAILED",
		message: error instanceof Error ? error.message : "PDF preflight failed.",
		diagnostics: [],
	});
});
