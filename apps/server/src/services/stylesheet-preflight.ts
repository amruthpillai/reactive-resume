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
// The worker is warmed once and reused, so the one-time cold load (which is
// super-linear in available CPU — measured ~9s at 0.5 vCPU, ~53s at 0.35, ~93s at
// 0.25) is paid at startup, not per request. This ceiling must exceed that cold
// load or warmup is killed mid-bootstrap and never completes on a throttled box;
// it only bounds a genuinely stuck bootstrap and is off the per-edit path.
const WORKER_READINESS_TIMEOUT_MS = 120_000;

type SerializedPreflightCause = {
	name: string;
	message: string;
	issues: readonly unknown[];
};

type StylesheetPreflightWorkerMessage =
	| { type: "ready" }
	| { type: "load_error"; message: string }
	| { type: "result"; requestId: number; result: PdfPreflightResult }
	| { type: "preflight_error"; requestId: number; cause: SerializedPreflightCause };

export type NodeStylesheetPreflightRunner = StylesheetPreflightRunner & {
	readonly activeWorkerCount: number;
	readonly queuedPreflightCount: number;
	warmup(): void;
	destroy(): Promise<void>;
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
		// Production must not inherit parent execArgv (e.g. --import/--input-type); source workers need tsx.
		execArgv: source ? sourceWorkerExecArgv() : [],
		...(source
			? {
					env: {
						...process.env,
						TSX_TSCONFIG_PATH: fileURLToPath(new URL("../../tsconfig.json", import.meta.url)),
					},
				}
			: {}),
	};
};

type PendingRequest = {
	resolve: (result: PdfPreflightResult) => void;
	reject: (cause: unknown) => void;
	renderTimer?: ReturnType<typeof setTimeout>;
};

type Readiness = {
	promise: Promise<Worker>;
	resolve: (worker: Worker) => void;
	reject: (error: Error) => void;
	timer: ReturnType<typeof setTimeout>;
};

export function createStylesheetPreflightRunner(
	overrides: Partial<StylesheetPreflightLimits> = {},
	testWorkerUrl?: URL,
): NodeStylesheetPreflightRunner {
	const limits = Object.freeze({ ...STYLESHEET_PREFLIGHT_LIMITS, ...overrides });

	let worker: Worker | undefined;
	let ready = false;
	let readiness: Readiness | undefined;
	let destroyed = false;
	let requestSeq = 0;

	const pending = new Map<number, PendingRequest>();
	// ponytail: process-local, bounded admission; upgrade to a pooled/distributed queue only for multi-process coordination.
	const queue: Array<{
		input: StylesheetPreflightInput;
		resolve: PendingRequest["resolve"];
		reject: PendingRequest["reject"];
	}> = [];

	const teardownWorker = () => {
		const dead = worker;
		worker = undefined;
		ready = false;
		if (readiness) {
			clearTimeout(readiness.timer);
			readiness.reject(new Error("Stylesheet preflight worker did not become ready."));
			readiness = undefined;
		}
		if (!dead) return;
		dead.off("message", onMessage);
		dead.off("error", onError);
		dead.off("exit", onExit);
		void dead.terminate().catch(() => undefined);
	};

	const clearPending = (requestId: number): PendingRequest | undefined => {
		const entry = pending.get(requestId);
		if (!entry) return undefined;
		if (entry.renderTimer) clearTimeout(entry.renderTimer);
		pending.delete(requestId);
		return entry;
	};

	const drainQueue = () => {
		while (!destroyed && pending.size < limits.maxConcurrentWorkers && queue.length > 0) {
			const next = queue.shift();
			if (!next) return;
			dispatch(next.input, next.resolve, next.reject);
		}
	};

	const resolveRequest = (requestId: number, result: PdfPreflightResult) => {
		const entry = clearPending(requestId);
		if (!entry) return;
		entry.resolve(result);
		drainQueue();
	};

	const rejectRequest = (requestId: number, cause: unknown) => {
		const entry = clearPending(requestId);
		if (!entry) return;
		entry.reject(cause);
		drainQueue();
	};

	// A crashed/exited/timed-out worker is torn down and its in-flight requests are
	// failed; the next dispatch (including any queued requests) spawns a fresh one,
	// so a poisoned render never lingers across requests.
	const failWorker = (result: PdfPreflightFailure) => {
		teardownWorker();
		const stale = [...pending.keys()];
		for (const requestId of stale) resolveRequest(requestId, result);
		drainQueue();
	};

	function onMessage(message: StylesheetPreflightWorkerMessage) {
		if (message.type === "ready") {
			if (readiness) {
				clearTimeout(readiness.timer);
				ready = true;
				const resolveReady = readiness.resolve;
				const readyWorker = worker;
				readiness = undefined;
				if (readyWorker) resolveReady(readyWorker);
			}
			return;
		}
		if (message.type === "load_error") {
			failWorker(failure("STYLESHEET_PREFLIGHT_WORKER_FAILED", message.message));
			return;
		}
		if (message.type === "result") {
			resolveRequest(message.requestId, message.result);
			return;
		}
		if (message.type === "preflight_error") {
			rejectRequest(
				message.requestId,
				Object.assign(new Error(message.cause.message), { name: message.cause.name, issues: message.cause.issues }),
			);
		}
	}

	function onError(error: Error) {
		console.warn("[stylesheet-preflight] worker error:", error.message);
		failWorker(workerFailure(error));
	}

	function onExit(code: number) {
		if (destroyed || (!worker && pending.size === 0)) return;
		console.warn(`[stylesheet-preflight] worker exited unexpectedly (code ${code})`);
		failWorker(failure("STYLESHEET_PREFLIGHT_WORKER_FAILED", "The PDF preflight worker failed."));
	}

	const startWorker = (): Promise<Worker> => {
		const location = testWorkerUrl ? { source: false, url: testWorkerUrl, execArgv: [] as string[] } : workerLocation();
		let spawned: Worker;
		try {
			spawned = new Worker(location.url, {
				name: "stylesheet-preflight",
				resourceLimits: {
					// The source-only tsx compiler heap is outside the production render budget.
					maxOldGenerationSizeMb: limits.maxOldGenerationMb + (location.source ? SOURCE_WORKER_LOADER_HEAP_MB : 0),
				},
				execArgv: location.execArgv,
				...("env" in location ? { env: location.env } : {}),
			});
		} catch (error) {
			return Promise.reject(error instanceof Error ? error : new Error("Failed to start PDF preflight worker."));
		}

		worker = spawned;
		ready = false;
		// The idle reused worker must not keep the process (or a test run) alive; active
		// requests stay alive through their ref'd readiness/render timers.
		spawned.unref();
		spawned.on("message", onMessage);
		spawned.once("error", onError);
		spawned.once("exit", onExit);

		let resolve!: (value: Worker) => void;
		let reject!: (error: Error) => void;
		const promise = new Promise<Worker>((resolvePromise, rejectPromise) => {
			resolve = resolvePromise;
			reject = rejectPromise;
		});
		const timer = setTimeout(() => {
			console.warn(`[stylesheet-preflight] worker did not become ready within ${WORKER_READINESS_TIMEOUT_MS}ms`);
			teardownWorker();
		}, WORKER_READINESS_TIMEOUT_MS);
		readiness = { promise, resolve, reject, timer };
		return promise;
	};

	const getReadyWorker = (): Promise<Worker> => {
		if (destroyed) return Promise.reject(new Error("Stylesheet preflight worker was terminated."));
		if (worker && ready) return Promise.resolve(worker);
		if (readiness) return readiness.promise;
		return startWorker();
	};

	// One retry: a worker that failed to become ready is torn down; a second
	// attempt spawns a fresh worker before the request gives up.
	const waitUntilReady = async (): Promise<Worker> => {
		try {
			return await getReadyWorker();
		} catch {
			return await getReadyWorker();
		}
	};

	function dispatch(
		input: StylesheetPreflightInput,
		resolve: PendingRequest["resolve"],
		reject: PendingRequest["reject"],
	) {
		const requestId = ++requestSeq;
		pending.set(requestId, { resolve, reject });
		void waitUntilReady()
			.then((readyWorker) => {
				const entry = pending.get(requestId);
				if (!entry) return;
				entry.renderTimer = setTimeout(() => {
					// A stuck render poisons the reused worker: tear it down and respawn — but
					// only the worker this request actually ran on, so a stale timer can never
					// kill a newer worker already serving other requests.
					clearPending(requestId);
					if (worker === readyWorker) teardownWorker();
					resolve(failure("STYLESHEET_PREFLIGHT_TIMEOUT", "The PDF preflight exceeded its deadline."));
					drainQueue();
				}, limits.timeoutMs);
				readyWorker.postMessage({ type: "preflight", requestId, input, limits });
			})
			.catch((error: unknown) => {
				resolveRequest(
					requestId,
					workerFailure(error instanceof Error ? error : new Error("Failed to start PDF preflight worker.")),
				);
			});
	}

	return {
		get activeWorkerCount() {
			return pending.size;
		},
		get queuedPreflightCount() {
			return queue.length;
		},

		warmup() {
			void waitUntilReady().catch(() => undefined);
		},

		run(input: StylesheetPreflightInput): Promise<PdfPreflightResult> {
			return new Promise<PdfPreflightResult>((resolve, reject) => {
				if (destroyed) {
					resolve(failure("STYLESHEET_PREFLIGHT_WORKER_FAILED", "The PDF preflight worker was terminated."));
					return;
				}
				if (pending.size < limits.maxConcurrentWorkers) {
					dispatch(input, resolve, reject);
					return;
				}
				if (queue.length >= limits.maxQueuedRequests) {
					resolve(failure("STYLESHEET_PREFLIGHT_WORKER_FAILED", "The PDF preflight queue is full."));
					return;
				}
				queue.push({ input, resolve, reject });
			});
		},

		async destroy() {
			destroyed = true;
			const dead = worker;
			teardownWorker();
			await dead?.terminate().catch(() => undefined);
			for (const requestId of [...pending.keys()]) {
				resolveRequest(
					requestId,
					failure("STYLESHEET_PREFLIGHT_WORKER_FAILED", "The PDF preflight worker was terminated."),
				);
			}
			while (queue.length > 0) {
				const next = queue.shift();
				next?.resolve(failure("STYLESHEET_PREFLIGHT_WORKER_FAILED", "The PDF preflight worker was terminated."));
			}
		},
	};
}

export const stylesheetPreflightRunner = createStylesheetPreflightRunner();
