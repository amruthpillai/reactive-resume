import { describe, expect, it, vi } from "vitest";
import { createCompileWorkerClient } from "./worker-client";

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
			for (const listener of listeners.get("error") ?? []) listener(event);
		},
	};
}

describe("stylesheet compiler worker client", () => {
	it("resolves every compiler result so the editor can generation-check", async () => {
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

	it("terminates the compiler worker and rejects pending work on destroy", async () => {
		const fake = worker();
		const client = createCompileWorkerClient(() => fake);
		const pending = client.compile({ editGeneration: 1 } as never);

		client.destroy();

		expect(fake.terminate).toHaveBeenCalledOnce();
		await expect(pending).rejects.toThrow("terminated");
	});
});
