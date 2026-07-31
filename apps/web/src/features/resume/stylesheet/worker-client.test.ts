import { describe, expect, it, vi } from "vitest";
import { getPreflightTransferables } from "./protocol";
import { createCompileWorkerClient, createPreflightWorkerClient } from "./worker-client";

type Listener = (event: MessageEvent) => void;

function worker() {
	const listeners = new Map<string, Set<EventListener>>();
	return {
		postMessage: vi.fn(),
		terminate: vi.fn(),
		addEventListener: vi.fn((type: string, listener: EventListener) => {
			const bucket = listeners.get(type) ?? new Set();
			bucket.add(listener);
			listeners.set(type, bucket);
		}),
		removeEventListener: vi.fn((type: string, listener: EventListener) => {
			listeners.get(type)?.delete(listener);
		}),
		emit(data: unknown) {
			for (const listener of listeners.get("message") ?? []) {
				(listener as Listener)(new MessageEvent("message", { data }));
			}
		},
		emitError(event: ErrorEvent) {
			for (const listener of listeners.get("error") ?? []) {
				listener(event);
			}
		},
	};
}

describe("stylesheet worker clients", () => {
	it("resolves older compiler results so callers can generation-check without aborting", async () => {
		const fake = worker();
		const client = createCompileWorkerClient(() => fake);
		const first = client.compile({ editGeneration: 1 } as never);
		const second = client.compile({ editGeneration: 2 } as never);

		fake.emit({ type: "compile_result", requestId: 1, editGeneration: 1, program: null, diagnostics: [] });
		fake.emit({ type: "compile_result", requestId: 2, editGeneration: 2, program: null, diagnostics: [] });

		await expect(first).resolves.toMatchObject({ requestId: 1, editGeneration: 1 });
		await expect(second).resolves.toMatchObject({ requestId: 2, editGeneration: 2 });
	});

	it("rejects pending compiles when the worker reports an error", async () => {
		const fake = worker();
		const client = createCompileWorkerClient(() => fake);
		const pending = client.compile({ editGeneration: 1 } as never);

		fake.emitError({ message: "Failed to load compiler worker" } as ErrorEvent);

		await expect(pending).rejects.toThrow("Failed to load compiler worker");
	});

	it("terminates and recreates a timed-out preflight worker", async () => {
		vi.useFakeTimers();
		const first = worker();
		const replacement = worker();
		const createWorker = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(replacement);
		const client = createPreflightWorkerClient(createWorker, 10);

		const timedOut = client.preflight({ editGeneration: 1 } as never);
		first.emit({ type: "preflight_ready" });
		await vi.advanceTimersByTimeAsync(10);

		await expect(timedOut).resolves.toMatchObject({
			result: { ok: false, code: "STYLESHEET_PREFLIGHT_TIMEOUT" },
		});
		expect(first.terminate).toHaveBeenCalledOnce();

		const next = client.preflight({ editGeneration: 2 } as never);
		replacement.emit({ type: "preflight_ready" });
		await vi.advanceTimersByTimeAsync(0);
		replacement.emit({
			type: "preflight_result",
			requestId: 2,
			editGeneration: 2,
			result: { ok: true, pageCount: 1, byteCount: 4, diagnostics: [], pdf: new ArrayBuffer(4) },
		});
		await expect(next).resolves.toMatchObject({ requestId: 2 });
		vi.useRealTimers();
	});

	it("warms the preflight worker before a request starts its deadline", () => {
		const fake = worker();
		const createWorker = vi.fn(() => fake);
		const client = createPreflightWorkerClient(createWorker, 5_000);

		client.warmup();

		expect(createWorker).toHaveBeenCalledOnce();
		expect(fake.addEventListener).toHaveBeenCalledTimes(2);
		expect(fake.addEventListener).toHaveBeenCalledWith("message", expect.any(Function));
		expect(fake.addEventListener).toHaveBeenCalledWith("error", expect.any(Function));
		expect(fake.postMessage).not.toHaveBeenCalled();
	});

	it("waits for readiness without consuming the request deadline", async () => {
		vi.useFakeTimers();
		const fake = worker();
		const client = createPreflightWorkerClient(() => fake, 5, 20);
		const result = client.preflight({ editGeneration: 1 } as never);

		await vi.advanceTimersByTimeAsync(5);
		expect(fake.terminate).not.toHaveBeenCalled();
		expect(fake.postMessage).not.toHaveBeenCalled();

		fake.emit({ type: "preflight_ready" });
		await vi.advanceTimersByTimeAsync(0);
		expect(fake.postMessage).toHaveBeenCalledOnce();
		await vi.advanceTimersByTimeAsync(5);
		await expect(result).resolves.toMatchObject({ result: { code: "STYLESHEET_PREFLIGHT_TIMEOUT" } });
		vi.useRealTimers();
	});

	it("rejects pending preflight work when the worker emits an error event", async () => {
		const fake = worker();
		const client = createPreflightWorkerClient(() => fake, 5_000);
		const pending = client.preflight({ editGeneration: 1 } as never);
		const outcome = pending.catch((error: unknown) => error);

		fake.emit({ type: "preflight_ready" });
		await Promise.resolve();
		fake.emitError({ message: "Worker crashed" } as ErrorEvent);

		expect(await outcome).toMatchObject({ message: "Worker crashed" });
		expect(fake.terminate).toHaveBeenCalled();
	});

	it("rejects structured resume-data failures without waiting for the timeout", async () => {
		vi.useFakeTimers();
		const fake = worker();
		const client = createPreflightWorkerClient(() => fake, 5_000);
		const pending = client.preflight({ editGeneration: 1 } as never);
		const outcome = pending.catch((error: unknown) => error);

		fake.emit({ type: "preflight_ready" });
		await vi.advanceTimersByTimeAsync(0);
		fake.emit({
			type: "preflight_error",
			requestId: 1,
			editGeneration: 1,
			cause: {
				name: "ZodError",
				message: "Invalid resume data",
				issues: [{ path: ["customSections", 0, "items", 0, "company"] }],
			},
		});

		expect(await outcome).toMatchObject({
			name: "ZodError",
			issues: [{ path: ["customSections", 0, "items", 0, "company"] }],
		});
		await vi.advanceTimersByTimeAsync(5_000);
		expect(fake.terminate).not.toHaveBeenCalled();
		vi.useRealTimers();
	});

	it("bounds readiness, recreates once, and rejects after the retry also times out", async () => {
		vi.useFakeTimers();
		const first = worker();
		const replacement = worker();
		const client = createPreflightWorkerClient(
			vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(replacement),
			5,
			10,
		);
		const result = client.preflight({ editGeneration: 1 } as never);
		const rejection = expect(result).rejects.toThrow("did not become ready");

		await vi.advanceTimersByTimeAsync(10);
		expect(first.terminate).toHaveBeenCalledOnce();
		await vi.advanceTimersByTimeAsync(10);

		await rejection;
		expect(replacement.terminate).toHaveBeenCalledOnce();
		vi.useRealTimers();
	});

	it("does not recreate a warming worker after destroy", async () => {
		vi.useFakeTimers();
		const fake = worker();
		const createWorker = vi.fn(() => fake);
		const client = createPreflightWorkerClient(createWorker, 5, 10);
		client.warmup();

		client.destroy();
		await vi.runAllTimersAsync();

		expect(createWorker).toHaveBeenCalledOnce();
		expect(fake.terminate).toHaveBeenCalledOnce();
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
		first.emit({ type: "preflight_ready" });
		await Promise.resolve();
		const staleOutcome = stale.catch((error: unknown) => error);
		const current = client.preflight({ editGeneration: 2 } as never);

		expect(first.terminate).toHaveBeenCalledOnce();
		replacement.emit({ type: "preflight_ready" });
		await Promise.resolve();
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
