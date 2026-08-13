import type {
	PdfPreflightPageLimits,
	PdfPreflightResult,
	StylesheetPreflightInput,
} from "@reactive-resume/pdf/preflight";
import { parentPort } from "node:worker_threads";
import * as React from "react";
import { inspectPreflightPdf } from "./stylesheet-preflight-inspection";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

type StylesheetPreflightWorkerLimits = PdfPreflightPageLimits & {
	maxPages: number;
	maxBytes: number;
};

// The worker is long-lived and reused across requests: the heavy PDF runtime is
// loaded once at startup and each preflight arrives as a message (input can no
// longer come from `workerData`, which is fixed at construction time).
type StylesheetPreflightWorkerRequest = {
	type: "preflight";
	requestId: number;
	input: StylesheetPreflightInput;
	limits: StylesheetPreflightWorkerLimits;
};

type SerializedPreflightCause = {
	name: string;
	message: string;
	issues: readonly unknown[];
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

// Load the heavy PDF runtime once. A rejection here (missing/broken dependency in
// a pruned production install) is reported explicitly instead of becoming an
// unhandled rejection that silently kills the worker and surfaces as an opaque
// runner-side failure.
const initialization = import("@reactive-resume/pdf/preflight");

void initialization.then(
	() => parentPort?.postMessage({ type: "ready" }),
	(cause: unknown) => {
		console.error("[stylesheet-preflight] worker runtime failed to load", cause);
		parentPort?.postMessage({ type: "load_error", message: sanitizeWorkerCause(cause) });
	},
);

const handle = async (request: StylesheetPreflightWorkerRequest): Promise<void> => {
	try {
		const { renderPreflightPdf } = await initialization;
		const rendered = await renderPreflightPdf(request.input, request.limits);
		const result: PdfPreflightResult = rendered.ok ? await inspectPreflightPdf(rendered, request.limits) : rendered;
		parentPort?.postMessage({ type: "result", requestId: request.requestId, result });
	} catch (cause) {
		const serializedCause = serializeZodCause(cause);
		if (serializedCause) {
			parentPort?.postMessage({ type: "preflight_error", requestId: request.requestId, cause: serializedCause });
			return;
		}
		console.error("[stylesheet-preflight]", cause);
		parentPort?.postMessage({
			type: "result",
			requestId: request.requestId,
			result: {
				ok: false,
				code: "STYLESHEET_PREFLIGHT_WORKER_FAILED",
				message: sanitizeWorkerCause(cause),
				diagnostics: [],
			},
		});
	}
};

parentPort?.on("message", (message: StylesheetPreflightWorkerRequest) => {
	if (message.type !== "preflight") return;
	void handle(message);
});
