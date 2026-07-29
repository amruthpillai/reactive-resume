import type { PdfPreflightPageLimits, PdfPreflightResult, StylesheetPreflightInput } from "@reactive-resume/pdf/server";
import { parentPort, workerData } from "node:worker_threads";
import * as React from "react";
import { renderPreflightPdf } from "@reactive-resume/pdf/server";
import { inspectPreflightPdf } from "./stylesheet-preflight-inspection";

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

parentPort?.postMessage({ type: "ready" });

async function run(): Promise<PdfPreflightResult> {
	const { input, limits } = workerData as StylesheetPreflightWorkerData;
	const rendered = await renderPreflightPdf(input, limits);
	return rendered.ok ? inspectPreflightPdf(rendered, limits) : rendered;
}

if (parentPort) {
	void run()
		.then(send)
		.catch(() => {
			send({
				ok: false,
				code: "STYLESHEET_PREFLIGHT_WORKER_FAILED",
				message: "The PDF preflight worker failed.",
				diagnostics: [],
			});
		});
}
