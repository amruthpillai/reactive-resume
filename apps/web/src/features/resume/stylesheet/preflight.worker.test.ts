import type { PreflightWorkerRequest } from "./protocol";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	renderPreflightPdf: vi.fn(),
	initializePdfInspection: vi.fn(async () => undefined),
	inspectPdfPageCount: vi.fn(),
}));

vi.mock("@reactive-resume/pdf/preflight", () => ({
	renderPreflightPdf: mocks.renderPreflightPdf,
}));

vi.mock("./pdf-inspection", () => ({
	initializePdfInspection: mocks.initializePdfInspection,
	inspectPdfPageCount: mocks.inspectPdfPageCount,
}));

describe("stylesheet preflight worker", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it("serializes schema errors into a correlated preflight error packet", async () => {
		let handler: ((event: MessageEvent<PreflightWorkerRequest>) => Promise<void>) | undefined;
		const postMessage = vi.fn();
		vi.stubGlobal("self", {
			postMessage,
			addEventListener: vi.fn((_type, listener) => {
				handler = listener as typeof handler;
			}),
		});
		const issues = [{ path: ["customSections", 0, "items", 0, "company"] }];
		mocks.renderPreflightPdf.mockRejectedValueOnce(
			Object.assign(new Error("Invalid resume data"), { name: "ZodError", issues }),
		);
		vi.resetModules();
		await import("./preflight.worker");

		await handler?.({
			data: {
				type: "preflight",
				requestId: 7,
				editGeneration: 3,
				input: {} as never,
				limits: {} as never,
			},
		} as unknown as MessageEvent<PreflightWorkerRequest>);

		expect(postMessage).toHaveBeenCalledWith({
			type: "preflight_error",
			requestId: 7,
			editGeneration: 3,
			cause: { name: "ZodError", message: "Invalid resume data", issues },
		});
	});
});
