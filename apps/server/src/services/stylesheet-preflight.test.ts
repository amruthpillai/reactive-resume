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

	it("terminates a real worker when the render exceeds its deadline", async () => {
		const runner = createStylesheetPreflightRunner({ timeoutMs: 1 });

		const result = await runner.run(input);

		expect(result).toEqual(expect.objectContaining({ ok: false, code: "STYLESHEET_PREFLIGHT_TIMEOUT" }));
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
	});
});
