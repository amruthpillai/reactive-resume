import type {
	PdfPreflightPageLimits,
	PdfPreflightResult,
	StylesheetPreflightInput,
} from "@reactive-resume/pdf/preflight";
import { parentPort, workerData } from "node:worker_threads";
import * as React from "react";
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

type SerializedPreflightCause = {
	name: string;
	message: string;
	issues: readonly unknown[];
};

const send = (result: PdfPreflightResult) => {
	parentPort?.postMessage(result);
};

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

const initialization = import("@reactive-resume/pdf/preflight");
void initialization.then(() => parentPort?.postMessage({ type: "ready" }));

async function run(): Promise<PdfPreflightResult> {
	const { renderPreflightPdf } = await initialization;
	const { input, limits } = workerData as StylesheetPreflightWorkerData;
	const rendered = await renderPreflightPdf(input, limits);
	return rendered.ok ? inspectPreflightPdf(rendered, limits) : rendered;
}

if (parentPort) {
	void run()
		.then(send)
		.catch((cause: unknown) => {
			const serializedCause = serializeZodCause(cause);
			if (serializedCause) {
				parentPort?.postMessage({ type: "preflight_error", cause: serializedCause });
				return;
			}
			console.error("[stylesheet-preflight]", cause);
			send({
				ok: false,
				code: "STYLESHEET_PREFLIGHT_WORKER_FAILED",
				message: sanitizeWorkerCause(cause),
				diagnostics: [],
			});
		});
}
