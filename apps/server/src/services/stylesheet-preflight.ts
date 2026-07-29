import type {
	PdfPreflightFailure,
	PdfPreflightResult,
	StylesheetPreflightInput,
	StylesheetPreflightRunner,
} from "@reactive-resume/pdf/server";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";
import { STYLESHEET_PREFLIGHT_LIMITS } from "@reactive-resume/pdf/preflight-reference";

export { STYLESHEET_PREFLIGHT_LIMITS } from "@reactive-resume/pdf/preflight-reference";

type StylesheetPreflightLimits = {
	timeoutMs: number;
	maxPages: number;
	maxBytes: number;
	maxPageWidthPt: number;
	maxPageHeightPt: number;
	maxPageAreaPt2: number;
	maxOldGenerationMb: number;
	maxConcurrentWorkers: number;
	maxQueuedRequests: number;
};

const SOURCE_WORKER_LOADER_HEAP_MB = 256;
const WORKER_STARTUP_TIMEOUT_MS = 15_000;

type StylesheetPreflightWorkerMessage = PdfPreflightResult | { type: "ready" };

export type NodeStylesheetPreflightRunner = StylesheetPreflightRunner & {
	readonly activeWorkerCount: number;
	readonly queuedPreflightCount: number;
};

const failure = (code: PdfPreflightFailure["code"], message: string): PdfPreflightFailure => ({
	ok: false,
	code,
	message,
	diagnostics: [],
});

const workerFailure = (error: Error): PdfPreflightFailure => {
	const code = (error as NodeJS.ErrnoException).code;
	return code === "ERR_WORKER_OUT_OF_MEMORY" || /heap out of memory/i.test(error.message)
		? failure("STYLESHEET_PREFLIGHT_MEMORY_LIMIT", "The PDF preflight worker exceeded its memory limit.")
		: failure("STYLESHEET_PREFLIGHT_WORKER_FAILED", "The PDF preflight worker failed.");
};

const sourceWorkerExecArgv = () => {
	const importIndex = process.execArgv.findIndex(
		(argument, index, arguments_) =>
			(argument === "--import" && arguments_[index + 1]?.includes("tsx")) ||
			(argument.startsWith("--import=") && argument.includes("tsx")),
	);
	const inherited = process.execArgv[importIndex];
	if (inherited?.startsWith("--import=")) return [inherited];
	if (inherited === "--import") return [inherited, process.execArgv[importIndex + 1] as string];
	return ["--import", import.meta.resolve("tsx")];
};

const workerLocation = () => {
	const source = import.meta.url.endsWith(".ts");
	return {
		source,
		url: source
			? new URL("../workers/stylesheet-preflight.ts", import.meta.url)
			: new URL("./stylesheet-preflight-worker.mjs", import.meta.url),
		...(source
			? {
					execArgv: sourceWorkerExecArgv(),
					env: {
						...process.env,
						TSX_TSCONFIG_PATH: fileURLToPath(new URL("../../tsconfig.json", import.meta.url)),
					},
				}
			: {}),
	};
};

export function createStylesheetPreflightRunner(
	overrides: Partial<StylesheetPreflightLimits> = {},
	testWorkerUrl?: URL,
): NodeStylesheetPreflightRunner {
	const limits = Object.freeze({ ...STYLESHEET_PREFLIGHT_LIMITS, ...overrides });
	let activeWorkerCount = 0;
	// ponytail: Keep admission process-local and bounded; upgrade to a distributed/pooled queue only for multi-process coordination.
	const queue: Array<{
		input: StylesheetPreflightInput;
		resolve: (result: PdfPreflightResult) => void;
	}> = [];

	const runWorker = (input: StylesheetPreflightInput, resolve: (result: PdfPreflightResult) => void): boolean => {
		// The URL seam is internal to the server package and keeps worker failure tests independent from the PDF renderer.
		const location = testWorkerUrl ? { source: false, url: testWorkerUrl } : workerLocation();
		let worker: Worker;
		try {
			worker = new Worker(location.url, {
				name: "stylesheet-preflight",
				workerData: { input, limits },
				resourceLimits: {
					// The source-only tsx compiler heap is outside the production render budget.
					maxOldGenerationSizeMb: limits.maxOldGenerationMb + (location.source ? SOURCE_WORKER_LOADER_HEAP_MB : 0),
				},
				...("execArgv" in location ? { execArgv: location.execArgv } : {}),
				...("env" in location ? { env: location.env } : {}),
			});
		} catch (error) {
			resolve(workerFailure(error instanceof Error ? error : new Error("Failed to start PDF preflight worker.")));
			return false;
		}

		activeWorkerCount += 1;
		let settled = false;
		let renderTimer: ReturnType<typeof setTimeout> | undefined;
		let startupTimer: ReturnType<typeof setTimeout> | undefined;

		const cleanup = () => {
			if (renderTimer) clearTimeout(renderTimer);
			if (startupTimer) clearTimeout(startupTimer);
			worker.off("message", onMessage);
			worker.off("error", onError);
			worker.off("exit", onExit);
			activeWorkerCount -= 1;
		};

		const finish = async (result: PdfPreflightResult) => {
			if (settled) return;
			settled = true;
			await worker.terminate().catch(() => undefined);
			cleanup();
			resolve(result);
			drainQueue();
		};

		const onMessage = (message: StylesheetPreflightWorkerMessage) => {
			if ("ok" in message) {
				void finish(message);
				return;
			}

			if (startupTimer) clearTimeout(startupTimer);
			renderTimer = setTimeout(() => {
				void finish(failure("STYLESHEET_PREFLIGHT_TIMEOUT", "The PDF preflight exceeded its deadline."));
			}, limits.timeoutMs);
		};
		const onError = (error: Error) => {
			void finish(workerFailure(error));
		};
		const onExit = () => {
			if (!settled) {
				void finish(failure("STYLESHEET_PREFLIGHT_WORKER_FAILED", "The PDF preflight worker failed."));
			}
		};

		worker.on("message", onMessage);
		worker.once("error", onError);
		worker.once("exit", onExit);
		startupTimer = setTimeout(() => {
			void finish(failure("STYLESHEET_PREFLIGHT_WORKER_FAILED", "The PDF preflight worker failed."));
		}, WORKER_STARTUP_TIMEOUT_MS);
		return true;
	};

	function drainQueue() {
		while (activeWorkerCount < limits.maxConcurrentWorkers && queue.length > 0) {
			const next = queue.shift();
			if (!next) return;
			runWorker(next.input, next.resolve);
		}
	}

	return {
		get activeWorkerCount() {
			return activeWorkerCount;
		},
		get queuedPreflightCount() {
			return queue.length;
		},

		run(input: StylesheetPreflightInput): Promise<PdfPreflightResult> {
			return new Promise<PdfPreflightResult>((resolve) => {
				if (activeWorkerCount < limits.maxConcurrentWorkers) {
					runWorker(input, resolve);
					return;
				}
				if (queue.length >= limits.maxQueuedRequests) {
					resolve(failure("STYLESHEET_PREFLIGHT_WORKER_FAILED", "The PDF preflight queue is full."));
					return;
				}
				queue.push({ input, resolve });
			});
		},
	};
}

export const stylesheetPreflightRunner = createStylesheetPreflightRunner();
