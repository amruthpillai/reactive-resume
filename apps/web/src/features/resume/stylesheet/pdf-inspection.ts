let pdfModule: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")>;

const loadPdfModule = () => (pdfModule ??= import("pdfjs-dist/legacy/build/pdf.mjs"));

const createNestedWorker = () =>
	new Worker(new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url), {
		type: "module",
		name: "rrss-pdfjs",
	});

export async function initializePdfInspection(): Promise<void> {
	await loadPdfModule();
}

export async function inspectPdfPageCount(
	pdf: ArrayBuffer,
	createWorker: () => Worker = createNestedWorker,
): Promise<number> {
	const { PDFWorker, getDocument } = await loadPdfModule();
	const nestedWorker = createWorker();
	const WorkerWithPort = PDFWorker as unknown as new (options: { port: Worker }) => InstanceType<typeof PDFWorker>;
	const worker = new WorkerWithPort({ port: nestedWorker });
	let loadingTask: ReturnType<typeof getDocument> | undefined;

	try {
		// PDF.js transfers its input to the nested worker and detaches the buffer.
		// Keep the caller's buffer intact so preflight can return those same bytes.
		loadingTask = getDocument({ data: pdf.slice(0), worker });
		const document = await loadingTask.promise;
		return document.numPages;
	} finally {
		try {
			if (loadingTask) await loadingTask.destroy();
			else worker.destroy();
		} finally {
			nestedWorker.terminate();
		}
	}
}
