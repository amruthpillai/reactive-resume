import { afterEach, describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createStylesheetPreflightRunner, STYLESHEET_PREFLIGHT_LIMITS } from "./stylesheet-preflight";

const validStylesheet = {
	languageVersion: 1,
	text: "@version 1;",
} as const;

const input = {
	data: defaultResumeData,
	template: defaultResumeData.metadata.template,
	stylesheet: validStylesheet,
} as const;

// Runners now own a long-lived, reused worker; destroy them so no worker thread
// outlives its test.
const runners: Array<{ destroy(): Promise<void> }> = [];
const track = <T extends { destroy(): Promise<void> }>(runner: T): T => {
	runners.push(runner);
	return runner;
};
afterEach(async () => {
	await Promise.all(runners.splice(0).map((runner) => runner.destroy()));
});

const memoryExhaustionWorker = new URL(
	`data:text/javascript,${encodeURIComponent(`
		const retained = [];
		while (true) {
			const batch = Array.from({ length: 100_000 }, (_, index) => ({ batch: retained.length, index }));
			retained.push(batch);
		}
	`)}`,
);

const failedWorker = new URL(
	`data:text/javascript,${encodeURIComponent('throw new Error("sensitive worker details");')}`,
);

// Counts how many preflights this single worker instance served so a reuse test
// can prove the worker is not respawned per request.
const reuseCountingWorker = new URL(
	`data:text/javascript,${encodeURIComponent(`
		import { parentPort } from "node:worker_threads";
		let served = 0;
		parentPort.postMessage({ type: "ready" });
		parentPort.on("message", (message) => {
			if (message?.type !== "preflight") return;
			served += 1;
			parentPort.postMessage({
				type: "result",
				requestId: message.requestId,
				result: { ok: true, pageCount: 1, byteCount: served, diagnostics: [] },
			});
		});
	`)}`,
);

const delayedSuccessfulWorker = new URL(
	`data:text/javascript,${encodeURIComponent(`
		import { parentPort } from "node:worker_threads";
		parentPort.postMessage({ type: "ready" });
		parentPort.on("message", (message) => {
			if (message?.type !== "preflight") return;
			setTimeout(() => {
				parentPort.postMessage({
					type: "result",
					requestId: message.requestId,
					result: {
						ok: true,
						pageCount: 1,
						byteCount: Number(message.input.data.basics.name),
						diagnostics: [],
					},
				});
			}, 300);
		});
	`)}`,
);

const delayedReadyWorker = new URL(
	`data:text/javascript,${encodeURIComponent(`
		import { parentPort } from "node:worker_threads";
		parentPort.on("message", (message) => {
			if (message?.type !== "preflight") return;
			setTimeout(() => {
				parentPort.postMessage({
					type: "result",
					requestId: message.requestId,
					result: { ok: true, pageCount: 1, byteCount: 1, diagnostics: [] },
				});
			}, 10);
		});
		setTimeout(() => parentPort.postMessage({ type: "ready" }), 50);
	`)}`,
);

const neverCompletesWorker = new URL(
	`data:text/javascript,${encodeURIComponent(`
		import { parentPort } from "node:worker_threads";
		parentPort.postMessage({ type: "ready" });
		setInterval(() => {}, 1_000);
	`)}`,
);

const synchronousFailureWorker = new URL("https://example.com/stylesheet-preflight.mjs");

const numberedInput = (number: number) => ({
	...input,
	data: {
		...input.data,
		basics: {
			...input.data.basics,
			name: String(number),
		},
	},
});

const invalidInput = () => {
	const data = structuredClone(defaultResumeData);
	data.customSections = [
		{
			id: "custom-experience",
			type: "experience",
			title: "Experience",
			icon: "",
			columns: 1,
			hidden: false,
			keepTogether: false,
			startOnNewPage: false,
			items: [{ id: "summary-shaped-item", hidden: false, content: "<p>Missing company</p>" }],
		} as never,
	];
	return { ...input, data };
};

describe("stylesheet PDF preflight worker", () => {
	it("keeps the production resource policy fixed and immutable", () => {
		expect(STYLESHEET_PREFLIGHT_LIMITS).toEqual({
			timeoutMs: 30_000,
			maxPages: 20,
			maxBytes: 10_000_000,
			maxPageWidthPt: 2_000,
			maxPageHeightPt: 20_000,
			maxPageAreaPt2: 20_000_000,
			maxOldGenerationMb: 256,
			maxConcurrentWorkers: 1,
			maxQueuedRequests: 32,
		});
		expect(Object.isFrozen(STYLESHEET_PREFLIGHT_LIMITS)).toBe(true);
	});

	it("accepts a bounded candidate render in an isolated worker", async () => {
		const runner = track(createStylesheetPreflightRunner({ timeoutMs: 15_000 }));

		const result = await runner.run(input);

		expect(result).toEqual(
			expect.objectContaining({
				ok: true,
				pageCount: 1,
				byteCount: expect.any(Number),
			}),
		);
		if (!result.ok) throw new Error(`Expected successful preflight, received ${result.code}.`);
		expect(result.byteCount).toBeGreaterThan(0);
		expect(runner.activeWorkerCount).toBe(0);
	}, 45_000);

	it("reuses one warm worker across sequential requests instead of cold-starting each one", async () => {
		const runner = track(createStylesheetPreflightRunner({}, reuseCountingWorker));

		const first = await runner.run(input);
		const second = await runner.run(input);
		const third = await runner.run(input);

		// A single reused worker increments its per-instance counter; a per-request
		// worker would report byteCount 1 every time.
		expect([first, second, third].map((result) => (result.ok ? result.byteCount : -1))).toEqual([1, 2, 3]);
		expect(runner.activeWorkerCount).toBe(0);
		expect(runner.queuedPreflightCount).toBe(0);
	});

	it("preserves structured resume-data failures across the worker boundary", async () => {
		const runner = track(createStylesheetPreflightRunner({ timeoutMs: 15_000 }));

		const result = runner.run(invalidInput());

		await expect(result).rejects.toMatchObject({
			name: "ZodError",
			issues: expect.arrayContaining([expect.objectContaining({ path: ["customSections", 0, "items", 0, "company"] })]),
		});
		expect(runner.activeWorkerCount).toBe(0);
		expect(runner.queuedPreflightCount).toBe(0);
	}, 20_000);

	it("terminates a worker when the render exceeds its deadline", async () => {
		const runner = track(createStylesheetPreflightRunner({ timeoutMs: 1 }, neverCompletesWorker));

		const result = await runner.run(input);

		expect(result).toEqual(expect.objectContaining({ ok: false, code: "STYLESHEET_PREFLIGHT_TIMEOUT" }));
		expect(runner.activeWorkerCount).toBe(0);
		expect(runner.queuedPreflightCount).toBe(0);
	});

	it("starts the authored render deadline after the worker runtime is ready", async () => {
		const runner = track(createStylesheetPreflightRunner({ timeoutMs: 20 }, delayedReadyWorker));

		await expect(runner.run(input)).resolves.toEqual(expect.objectContaining({ ok: true, pageCount: 1 }));
		expect(runner.activeWorkerCount).toBe(0);
	});

	it("returns deterministic output byte and page limit codes", async () => {
		const byteRunner = track(createStylesheetPreflightRunner({ maxBytes: 16 }));
		const pageRunner = track(createStylesheetPreflightRunner({ maxPages: 0 }));

		await expect(byteRunner.run(input)).resolves.toEqual(
			expect.objectContaining({ ok: false, code: "STYLESHEET_PREFLIGHT_BYTE_LIMIT" }),
		);
		await expect(pageRunner.run(input)).resolves.toEqual(
			expect.objectContaining({ ok: false, code: "STYLESHEET_PREFLIGHT_PAGE_LIMIT" }),
		);
		expect(byteRunner.activeWorkerCount).toBe(0);
		expect(pageRunner.activeWorkerCount).toBe(0);
	}, 30_000);

	it("maps worker heap exhaustion to a controlled memory-limit result", async () => {
		const runner = track(
			createStylesheetPreflightRunner({ maxOldGenerationMb: 8, timeoutMs: 10_000 }, memoryExhaustionWorker),
		);

		const result = await runner.run(input);

		expect(result).toEqual(expect.objectContaining({ ok: false, code: "STYLESHEET_PREFLIGHT_MEMORY_LIMIT" }));
		expect(runner.activeWorkerCount).toBe(0);
	}, 15_000);

	it("does not expose internal errors from a failed worker bootstrap", async () => {
		const runner = track(createStylesheetPreflightRunner({}, failedWorker));

		const result = await runner.run(input);

		expect(result).toEqual({
			ok: false,
			code: "STYLESHEET_PREFLIGHT_WORKER_FAILED",
			message: "The PDF preflight worker failed.",
			diagnostics: [],
		});
		expect(runner.activeWorkerCount).toBe(0);
		expect(runner.queuedPreflightCount).toBe(0);
	});

	it("surfaces sanitized render failures from inside the worker catch path", async () => {
		const throwingWorker = new URL(
			`data:text/javascript,${encodeURIComponent(`
				import { parentPort } from "node:worker_threads";
				parentPort.postMessage({ type: "ready" });
				parentPort.on("message", (message) => {
					if (message?.type !== "preflight") return;
					parentPort.postMessage({
						type: "result",
						requestId: message.requestId,
						result: {
							ok: false,
							code: "STYLESHEET_PREFLIGHT_WORKER_FAILED",
							message: "The PDF preflight worker failed. (Error: Canvas is already closed)",
							diagnostics: [],
						},
					});
				});
			`)}`,
		);
		const runner = track(createStylesheetPreflightRunner({ timeoutMs: 5_000 }, throwingWorker));

		const result = await runner.run(input);

		expect(result).toEqual({
			ok: false,
			code: "STYLESHEET_PREFLIGHT_WORKER_FAILED",
			message: "The PDF preflight worker failed. (Error: Canvas is already closed)",
			diagnostics: [],
		});
	});

	it("bounds concurrent workers and queued requests without charging queue time to the worker deadline", async () => {
		const runner = track(
			createStylesheetPreflightRunner(
				{
					timeoutMs: 500,
					maxConcurrentWorkers: 1,
					maxQueuedRequests: 2,
				},
				delayedSuccessfulWorker,
			),
		);
		const completionOrder: number[] = [];
		const accepted = [1, 2, 3].map((number) =>
			runner.run(numberedInput(number)).then((result) => {
				if (result.ok) completionOrder.push(result.byteCount);
				return result;
			}),
		);
		const rejected = runner.run(numberedInput(4));

		expect(runner.activeWorkerCount).toBe(1);
		expect(runner.queuedPreflightCount).toBe(2);
		await expect(rejected).resolves.toEqual(
			expect.objectContaining({
				code: "STYLESHEET_PREFLIGHT_WORKER_FAILED",
				message: "The PDF preflight queue is full.",
			}),
		);
		const results = await Promise.all(accepted);

		expect(results.every((result) => result.ok)).toBe(true);
		expect(completionOrder).toEqual([1, 2, 3]);
		expect(runner.activeWorkerCount).toBe(0);
		expect(runner.queuedPreflightCount).toBe(0);
	}, 5_000);

	it("does not leak a slot when the worker constructor throws synchronously", async () => {
		const runner = track(createStylesheetPreflightRunner({}, synchronousFailureWorker));

		await expect(runner.run(input)).resolves.toEqual(
			expect.objectContaining({ ok: false, code: "STYLESHEET_PREFLIGHT_WORKER_FAILED" }),
		);
		expect(runner.activeWorkerCount).toBe(0);
		expect(runner.queuedPreflightCount).toBe(0);
	});
});
