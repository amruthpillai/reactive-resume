import type {
	CompileWorkerInput,
	CompileWorkerRequest,
	CompileWorkerResponse,
	PreflightWorkerInput,
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

export function createPreflightWorkerClient(createWorker: () => StylesheetWorker, timeoutMs: number) {
	let worker: StylesheetWorker | undefined;
	let requestId = 0;
	const pending = new Map<number, Pending<PreflightWorkerResponse> & { timer: ReturnType<typeof setTimeout> }>();

	const onMessage: WorkerListener = ({ data }) => {
		const response = data as PreflightWorkerResponse;
		if (response?.type !== "preflight_result") return;
		const request = pending.get(response.requestId);
		if (!request) return;
		clearTimeout(request.timer);
		pending.delete(response.requestId);
		request.resolve(response);
	};

	const getWorker = () => {
		if (worker) return worker;
		worker = createWorker();
		worker.addEventListener("message", onMessage);
		return worker;
	};

	const terminate = () => {
		if (!worker) return;
		worker.removeEventListener("message", onMessage);
		worker.terminate();
		worker = undefined;
	};

	return {
		preflight(input: PreflightWorkerInput): Promise<PreflightWorkerResponse> {
			if (pending.size > 0) {
				terminate();
				for (const stale of pending.values()) {
					clearTimeout(stale.timer);
					stale.reject(new Error("Discarded stale stylesheet preflight result."));
				}
				pending.clear();
			}
			const request: PreflightWorkerRequest = { ...input, type: "preflight", requestId: ++requestId };
			return new Promise((resolve, reject) => {
				const timer = setTimeout(() => {
					pending.delete(request.requestId);
					terminate();
					resolve(timeoutResult(request));
				}, timeoutMs);
				pending.set(request.requestId, { resolve, reject, timer });
				getWorker().postMessage(request);
			});
		},
		destroy() {
			terminate();
			for (const request of pending.values()) {
				clearTimeout(request.timer);
				request.reject(new Error("Stylesheet preflight worker was terminated."));
			}
			pending.clear();
		},
	};
}
