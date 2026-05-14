// @vitest-environment happy-dom

import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";

const pdfViewerMock = vi.hoisted(() => {
	const pdfDocument = {
		destroy: vi.fn(),
		numPages: 1,
	};

	const loadingTask = {
		destroy: vi.fn(),
		promise: Promise.resolve(pdfDocument),
	};

	return {
		constructorOptions: [] as Array<{ abortSignal?: AbortSignal; container: HTMLDivElement }>,
		createResumePdfBlob: vi.fn(async () => new Blob(["%PDF"], { type: "application/pdf" })),
		getDocument: vi.fn(() => loadingTask),
		instances: [] as Array<{
			abortSignal?: AbortSignal;
			setDocument: ReturnType<typeof vi.fn>;
			update: ReturnType<typeof vi.fn>;
		}>,
		loadingTask,
		pdfDocument,
	};
});

vi.mock("@/libs/resume/pdf-document", () => ({
	createResumePdfBlob: pdfViewerMock.createResumePdfBlob,
}));

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
	AnnotationMode: { ENABLE_FORMS: 2 },
	getDocument: pdfViewerMock.getDocument,
	GlobalWorkerOptions: {},
}));

vi.mock("pdfjs-dist/legacy/web/pdf_viewer.mjs", () => {
	class EventBus {
		private readonly listeners = new Map<string, Set<() => void>>();

		on(name: string, listener: () => void) {
			const listeners = this.listeners.get(name) ?? new Set<() => void>();
			listeners.add(listener);
			this.listeners.set(name, listeners);
		}

		off(name: string, listener: () => void) {
			this.listeners.get(name)?.delete(listener);
		}

		dispatch(name: string) {
			for (const listener of this.listeners.get(name) ?? []) listener();
		}
	}

	class PDFLinkService {
		setDocument = vi.fn();
		setViewer = vi.fn();
	}

	class PDFViewer {
		currentScaleValue = "";
		setDocument: ReturnType<typeof vi.fn>;
		update = vi.fn();

		constructor(options: { abortSignal?: AbortSignal; container: HTMLDivElement; eventBus: EventBus }) {
			pdfViewerMock.constructorOptions.push(options);
			this.setDocument = vi.fn((document: unknown) => {
				if (document) options.eventBus.dispatch("pagesinit");
			});
			pdfViewerMock.instances.push(this);
		}
	}

	return {
		EventBus,
		LinkTarget: { BLANK: 2 },
		PDFLinkService,
		PDFViewer,
	};
});

const { PdfViewer } = await import("./pdf-viewer");

beforeEach(() => {
	pdfViewerMock.constructorOptions.length = 0;
	pdfViewerMock.instances.length = 0;
	pdfViewerMock.createResumePdfBlob.mockClear();
	pdfViewerMock.getDocument.mockClear();
	pdfViewerMock.loadingTask.destroy.mockClear();
	pdfViewerMock.pdfDocument.destroy.mockClear();
});

describe("PdfViewer", () => {
	it("uses PDF.js' absolute container contract and disposes viewer state", async () => {
		const view = render(<PdfViewer data={sampleResumeData} />);

		await waitFor(() => expect(pdfViewerMock.constructorOptions).toHaveLength(1));

		const [{ abortSignal, container }] = pdfViewerMock.constructorOptions;
		const [viewer] = pdfViewerMock.instances;

		expect(container).toHaveClass("absolute", "inset-0", "overflow-visible");
		expect(abortSignal).toBeInstanceOf(AbortSignal);
		expect(viewer.setDocument).toHaveBeenCalledWith(pdfViewerMock.pdfDocument);

		view.unmount();

		expect(abortSignal?.aborted).toBe(true);
		expect(viewer.setDocument).toHaveBeenCalledWith(null);
		expect(pdfViewerMock.pdfDocument.destroy).toHaveBeenCalledTimes(1);
		expect(pdfViewerMock.loadingTask.destroy).toHaveBeenCalledTimes(1);
	});
});
