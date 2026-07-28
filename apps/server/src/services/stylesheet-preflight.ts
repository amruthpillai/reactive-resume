import type {
	PdfPreflightFailure,
	PdfPreflightResult,
	StylesheetPreflightInput,
	StylesheetPreflightRunner,
} from "@reactive-resume/pdf/server";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

type StylesheetPreflightLimits = {
	timeoutMs: number;
	maxPages: number;
	maxBytes: number;
	maxPageWidthPt: number;
	maxPageHeightPt: number;
	maxPageAreaPt2: number;
	maxOldGenerationMb: number;
};

export const STYLESHEET_PREFLIGHT_LIMITS: Readonly<StylesheetPreflightLimits> = Object.freeze({
	timeoutMs: 5_000,
	maxPages: 20,
	maxBytes: 10_000_000,
	maxPageWidthPt: 2_000,
	maxPageHeightPt: 20_000,
	maxPageAreaPt2: 20_000_000,
	maxOldGenerationMb: 256,
});

const SOURCE_WORKER_LOADER_HEAP_MB = 256;

export type NodeStylesheetPreflightRunner = StylesheetPreflightRunner & {
	readonly activeWorkerCount: number;
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

	return {
		get activeWorkerCount() {
			return activeWorkerCount;
		},

		run(input: StylesheetPreflightInput): Promise<PdfPreflightResult> {
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
				return Promise.resolve(
					workerFailure(error instanceof Error ? error : new Error("Failed to start PDF preflight worker.")),
				);
			}

			activeWorkerCount += 1;

			return new Promise<PdfPreflightResult>((resolve) => {
				let settled = false;
				let timer: ReturnType<typeof setTimeout>;

				const cleanup = () => {
					clearTimeout(timer);
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
				};

				const onMessage = (result: PdfPreflightResult) => {
					void finish(result);
				};
				const onError = (error: Error) => {
					void finish(workerFailure(error));
				};
				const onExit = () => {
					if (!settled) {
						void finish(failure("STYLESHEET_PREFLIGHT_WORKER_FAILED", "The PDF preflight worker failed."));
					}
				};

				worker.once("message", onMessage);
				worker.once("error", onError);
				worker.once("exit", onExit);
				timer = setTimeout(() => {
					void finish(failure("STYLESHEET_PREFLIGHT_TIMEOUT", "The PDF preflight exceeded its deadline."));
				}, limits.timeoutMs);
			});
		},
	};
}

export const stylesheetPreflightRunner = createStylesheetPreflightRunner();
