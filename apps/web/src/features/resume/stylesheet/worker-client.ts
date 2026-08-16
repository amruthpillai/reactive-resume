import type { CompileWorkerInput, CompileWorkerRequest, CompileWorkerResponse } from "./protocol";

type WorkerListener = (event: MessageEvent<unknown>) => void;
type WorkerErrorListener = (event: ErrorEvent) => void;

export type StylesheetWorker = {
	postMessage(message: unknown, transfer?: Transferable[]): void;
	terminate(): void;
	addEventListener(type: "message", listener: WorkerListener): void;
	addEventListener(type: "error", listener: WorkerErrorListener): void;
	removeEventListener(type: "message", listener: WorkerListener): void;
	removeEventListener(type: "error", listener: WorkerErrorListener): void;
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
		// Resolve every in-flight compile. Callers already generation-check; rejecting "stale"
		// results aborts the edit pipeline and can leave the editor stuck on Checking.
		request.resolve(response);
	};
	const onError: WorkerErrorListener = (event) => {
		const error = new Error(event.message || "Stylesheet compiler worker failed to load.");
		for (const request of pending.values()) request.reject(error);
		pending.clear();
	};
	worker.addEventListener("message", onMessage);
	worker.addEventListener("error", onError);

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
			worker.removeEventListener("error", onError);
			worker.terminate();
			for (const request of pending.values()) request.reject(new Error("Stylesheet compiler worker was terminated."));
			pending.clear();
		},
	};
}
