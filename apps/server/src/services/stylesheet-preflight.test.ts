import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createStylesheetPreflightRunner, STYLESHEET_PREFLIGHT_LIMITS } from "./stylesheet-preflight";

const validStylesheet = {
	languageVersion: 1,
	text: "@rr-version 1;",
} as const;

const input = {
	data: defaultResumeData,
	template: defaultResumeData.metadata.template,
	stylesheet: validStylesheet,
} as const;

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

const delayedSuccessfulWorker = new URL(
	`data:text/javascript,${encodeURIComponent(`
		import { parentPort, workerData } from "node:worker_threads";
		parentPort.postMessage({ type: "ready" });
		setTimeout(() => {
			parentPort.postMessage({
				ok: true,
				pageCount: 1,
				byteCount: Number(workerData.input.data.basics.name),
				diagnostics: [],
			});
		}, 300);
	`)}`,
);

const delayedReadyWorker = new URL(
	`data:text/javascript,${encodeURIComponent(`
		import { parentPort } from "node:worker_threads";
		setTimeout(() => {
			parentPort.postMessage({ type: "ready" });
			setTimeout(() => {
				parentPort.postMessage({
					ok: true,
					pageCount: 1,
					byteCount: 1,
					diagnostics: [],
				});
			}, 10);
		}, 50);
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
			timeoutMs: 5_000,
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
		const runner = createStylesheetPreflightRunner({ timeoutMs: 15_000 });

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
	}, 20_000);

	it("preserves structured resume-data failures across the worker boundary", async () => {
		const runner = createStylesheetPreflightRunner({ timeoutMs: 15_000 });

		const result = runner.run(invalidInput());

		await expect(result).rejects.toMatchObject({
			name: "ZodError",
			issues: expect.arrayContaining([expect.objectContaining({ path: ["customSections", 0, "items", 0, "company"] })]),
		});
		expect(runner.activeWorkerCount).toBe(0);
		expect(runner.queuedPreflightCount).toBe(0);
	}, 20_000);

	it("terminates a real worker when the render exceeds its deadline", async () => {
		const runner = createStylesheetPreflightRunner({ timeoutMs: 1 });

		const result = await runner.run(input);

		expect(result).toEqual(expect.objectContaining({ ok: false, code: "STYLESHEET_PREFLIGHT_TIMEOUT" }));
		expect(runner.activeWorkerCount).toBe(0);
		expect(runner.queuedPreflightCount).toBe(0);
	});

	it("starts the authored render deadline after the worker runtime is ready", async () => {
		const runner = createStylesheetPreflightRunner({ timeoutMs: 20 }, delayedReadyWorker);

		await expect(runner.run(input)).resolves.toEqual(expect.objectContaining({ ok: true, pageCount: 1 }));
		expect(runner.activeWorkerCount).toBe(0);
	});

	it("returns deterministic output byte and page limit codes", async () => {
		const byteRunner = createStylesheetPreflightRunner({ maxBytes: 16 });
		const pageRunner = createStylesheetPreflightRunner({ maxPages: 0 });

		await expect(byteRunner.run(input)).resolves.toEqual(
			expect.objectContaining({ ok: false, code: "STYLESHEET_PREFLIGHT_BYTE_LIMIT" }),
		);
		await expect(pageRunner.run(input)).resolves.toEqual(
			expect.objectContaining({ ok: false, code: "STYLESHEET_PREFLIGHT_PAGE_LIMIT" }),
		);
		expect(byteRunner.activeWorkerCount).toBe(0);
		expect(pageRunner.activeWorkerCount).toBe(0);
	}, 15_000);

	it("maps worker heap exhaustion to a controlled memory-limit result", async () => {
		const runner = createStylesheetPreflightRunner(
			{ maxOldGenerationMb: 8, timeoutMs: 10_000 },
			memoryExhaustionWorker,
		);

		const result = await runner.run(input);

		expect(result).toEqual(expect.objectContaining({ ok: false, code: "STYLESHEET_PREFLIGHT_MEMORY_LIMIT" }));
		expect(runner.activeWorkerCount).toBe(0);
	}, 15_000);

	it("does not expose internal errors from a failed worker", async () => {
		const runner = createStylesheetPreflightRunner({}, failedWorker);

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

	it("bounds concurrent workers and queued requests without charging queue time to the worker deadline", async () => {
		const runner = createStylesheetPreflightRunner(
			{
				timeoutMs: 500,
				maxConcurrentWorkers: 1,
				maxQueuedRequests: 2,
			},
			delayedSuccessfulWorker,
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
		const runner = createStylesheetPreflightRunner({}, synchronousFailureWorker);

		await expect(runner.run(input)).resolves.toEqual(
			expect.objectContaining({ ok: false, code: "STYLESHEET_PREFLIGHT_WORKER_FAILED" }),
		);
		expect(runner.activeWorkerCount).toBe(0);
		expect(runner.queuedPreflightCount).toBe(0);
	});
});
