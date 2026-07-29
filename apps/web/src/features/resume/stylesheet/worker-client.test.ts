import { describe, expect, it, vi } from "vitest";
import { getPreflightTransferables } from "./protocol";
import { createCompileWorkerClient, createPreflightWorkerClient } from "./worker-client";

type Listener = (event: MessageEvent) => void;

function worker() {
	const listeners = new Set<Listener>();
	return {
		postMessage: vi.fn(),
		terminate: vi.fn(),
		addEventListener: vi.fn((_type: string, listener: Listener) => listeners.add(listener)),
		removeEventListener: vi.fn((_type: string, listener: Listener) => listeners.delete(listener)),
		emit(data: unknown) {
			for (const listener of listeners) listener(new MessageEvent("message", { data }));
		},
	};
}

describe("stylesheet worker clients", () => {
	it("rejects stale compiler results by request id", async () => {
		const fake = worker();
		const client = createCompileWorkerClient(() => fake);
		const first = client.compile({ editGeneration: 1 } as never);
		const second = client.compile({ editGeneration: 2 } as never);

		fake.emit({ type: "compile_result", requestId: 1, editGeneration: 1, program: null, diagnostics: [] });
		fake.emit({ type: "compile_result", requestId: 2, editGeneration: 2, program: null, diagnostics: [] });

		await expect(first).rejects.toThrow("stale");
		await expect(second).resolves.toMatchObject({ requestId: 2 });
	});

	it("terminates and recreates a timed-out preflight worker", async () => {
		vi.useFakeTimers();
		const first = worker();
		const replacement = worker();
		const createWorker = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(replacement);
		const client = createPreflightWorkerClient(createWorker, 10);

		const timedOut = client.preflight({ editGeneration: 1 } as never);
		await vi.advanceTimersByTimeAsync(10);

		await expect(timedOut).resolves.toMatchObject({
			result: { ok: false, code: "STYLESHEET_PREFLIGHT_TIMEOUT" },
		});
		expect(first.terminate).toHaveBeenCalledOnce();

		const next = client.preflight({ editGeneration: 2 } as never);
		replacement.emit({
			type: "preflight_result",
			requestId: 2,
			editGeneration: 2,
			result: { ok: true, pageCount: 1, byteCount: 4, diagnostics: [], pdf: new ArrayBuffer(4) },
		});
		await expect(next).resolves.toMatchObject({ requestId: 2 });
		vi.useRealTimers();
	});

	it("terminates stale preflight work when a newer request starts", async () => {
		const first = worker();
		const replacement = worker();
		const client = createPreflightWorkerClient(
			vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(replacement),
			1_000,
		);
		const stale = client.preflight({ editGeneration: 1 } as never);
		const staleOutcome = stale.catch((error: unknown) => error);
		const current = client.preflight({ editGeneration: 2 } as never);

		expect(first.terminate).toHaveBeenCalledOnce();
		replacement.emit({
			type: "preflight_result",
			requestId: 2,
			editGeneration: 2,
			result: { ok: true, pageCount: 1, byteCount: 4, diagnostics: [], pdf: new ArrayBuffer(4) },
		});
		expect(await staleOutcome).toEqual(expect.objectContaining({ message: expect.stringContaining("stale") }));
		await expect(current).resolves.toMatchObject({ requestId: 2 });
	});

	it("transfers the generated PDF buffer", () => {
		const pdf = new ArrayBuffer(4);
		expect(
			getPreflightTransferables({
				type: "preflight_result",
				requestId: 1,
				editGeneration: 1,
				result: { ok: true, pageCount: 1, byteCount: 4, diagnostics: [], pdf },
			}),
		).toEqual([pdf]);
	});
});
