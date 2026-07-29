import type {
	CompileWorkerInput,
	CompileWorkerRequest,
	CompileWorkerResponse,
	PreflightWorkerError,
	PreflightWorkerInput,
	PreflightWorkerReady,
	PreflightWorkerRequest,
	PreflightWorkerResponse,
} from "./protocol";

type WorkerListener = (event: MessageEvent<unknown>) => void;

export type StylesheetWorker = {
	postMessage(message: unknown, transfer?: Transferable[]): void;
	terminate(): void;
	addEventListener(type: "message", listener: WorkerListener): void;
	removeEventListener(type: "message", listener: WorkerListener): void;
};

type Pending<T> = {
	resolve(value: T): void;
	reject(error: Error): void;
};

export function createCompileWorkerClient(createWorker: () => StylesheetWorker) {
	const worker = createWorker();
	const pending = new Map<number, Pending<CompileWorkerResponse>>();
	let latestRequestId = 0;

	const onMessage: WorkerListener = ({ data }) => {
		const response = data as CompileWorkerResponse;
		if (response?.type !== "compile_result") return;
		const request = pending.get(response.requestId);
		if (!request) return;
		pending.delete(response.requestId);
		if (response.requestId !== latestRequestId) {
			request.reject(new Error("Discarded stale stylesheet compiler result."));
			return;
		}
		request.resolve(response);
	};
	worker.addEventListener("message", onMessage);

	return {
		compile(input: CompileWorkerInput): Promise<CompileWorkerResponse> {
			const requestId = ++latestRequestId;
			const request: CompileWorkerRequest = { ...input, type: "compile", requestId };
			return new Promise((resolve, reject) => {
				pending.set(requestId, { resolve, reject });
				worker.postMessage(request);
			});
		},
		destroy() {
			worker.removeEventListener("message", onMessage);
			worker.terminate();
			for (const request of pending.values()) request.reject(new Error("Stylesheet compiler worker was terminated."));
			pending.clear();
		},
	};
}

const timeoutResult = (request: PreflightWorkerRequest): PreflightWorkerResponse => ({
	type: "preflight_result",
	requestId: request.requestId,
	editGeneration: request.editGeneration,
	result: {
		ok: false,
		code: "STYLESHEET_PREFLIGHT_TIMEOUT",
		message: "The PDF preflight exceeded its deadline.",
		diagnostics: [],
	},
});

export function createPreflightWorkerClient(
	createWorker: () => StylesheetWorker,
	timeoutMs: number,
	readinessTimeoutMs = 10_000,
) {
	let worker: StylesheetWorker | undefined;
	let requestId = 0;
	let ready = false;
	let destroyed = false;
	let readiness:
		| (Pending<StylesheetWorker> & {
				promise: Promise<StylesheetWorker>;
				timer: ReturnType<typeof setTimeout>;
		  })
		| undefined;
	const pending = new Map<number, Pending<PreflightWorkerResponse> & { timer?: ReturnType<typeof setTimeout> }>();

	const onMessage: WorkerListener = ({ data }) => {
		if ((data as PreflightWorkerReady)?.type === "preflight_ready") {
			if (!worker || !readiness) return;
			clearTimeout(readiness.timer);
			ready = true;
			readiness.resolve(worker);
			readiness = undefined;
			return;
		}
		const workerError = data as PreflightWorkerError;
		if (workerError?.type === "preflight_error") {
			const request = pending.get(workerError.requestId);
			if (!request) return;
			if (request.timer) clearTimeout(request.timer);
			pending.delete(workerError.requestId);
			request.reject(
				Object.assign(new Error(workerError.cause.message), {
					name: workerError.cause.name,
					issues: workerError.cause.issues,
				}),
			);
			return;
		}
		const response = data as PreflightWorkerResponse;
		if (response?.type !== "preflight_result") return;
		const request = pending.get(response.requestId);
		if (!request) return;
		if (request.timer) clearTimeout(request.timer);
		pending.delete(response.requestId);
		request.resolve(response);
	};

	const terminate = () => {
		if (!worker) return;
		worker.removeEventListener("message", onMessage);
		worker.terminate();
		worker = undefined;
		ready = false;
		if (readiness) {
			clearTimeout(readiness.timer);
			readiness.reject(new Error("Stylesheet preflight worker did not become ready."));
			readiness = undefined;
		}
	};

	const getReadyWorker = () => {
		if (destroyed) return Promise.reject(new Error("Stylesheet preflight worker was terminated."));
		if (worker && ready) return Promise.resolve(worker);
		if (readiness) return readiness.promise;
		worker = createWorker();
		worker.addEventListener("message", onMessage);
		let resolve!: (value: StylesheetWorker) => void;
		let reject!: (error: Error) => void;
		const promise = new Promise<StylesheetWorker>((resolvePromise, rejectPromise) => {
			resolve = resolvePromise;
			reject = rejectPromise;
		});
		const timer = setTimeout(() => terminate(), readinessTimeoutMs);
		readiness = { promise, resolve, reject, timer };
		return promise;
	};

	const waitUntilReady = async () => {
		try {
			return await getReadyWorker();
		} catch {
			return await getReadyWorker();
		}
	};

	return {
		warmup() {
			void waitUntilReady().catch(() => {});
		},
		preflight(input: PreflightWorkerInput): Promise<PreflightWorkerResponse> {
			if (pending.size > 0) {
				terminate();
				for (const stale of pending.values()) {
					if (stale.timer) clearTimeout(stale.timer);
					stale.reject(new Error("Discarded stale stylesheet preflight result."));
				}
				pending.clear();
			}
			const request: PreflightWorkerRequest = { ...input, type: "preflight", requestId: ++requestId };
			return new Promise((resolve, reject) => {
				pending.set(request.requestId, { resolve, reject });
				void waitUntilReady()
					.then((readyWorker) => {
						const current = pending.get(request.requestId);
						if (!current) return;
						current.timer = setTimeout(() => {
							pending.delete(request.requestId);
							terminate();
							resolve(timeoutResult(request));
						}, timeoutMs);
						readyWorker.postMessage(request);
					})
					.catch((error: unknown) => {
						const current = pending.get(request.requestId);
						if (!current) return;
						pending.delete(request.requestId);
						reject(error instanceof Error ? error : new Error("Stylesheet preflight worker failed to start."));
					});
			});
		},
		destroy() {
			destroyed = true;
			terminate();
			for (const request of pending.values()) {
				if (request.timer) clearTimeout(request.timer);
				request.reject(new Error("Stylesheet preflight worker was terminated."));
			}
			pending.clear();
		},
	};
}
