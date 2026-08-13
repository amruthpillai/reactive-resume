// @vitest-environment happy-dom

import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPublicStyleProjection } from "@reactive-resume/pdf/public-projection";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";

const pdfViewerMock = vi.hoisted(() => {
	const pdfDocument = {
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
		fetch: vi.fn(
			async (_input: string | URL) => new Response(new Blob(["%PDF-fallback"], { type: "application/pdf" })),
		),
		instances: [] as Array<{
			abortSignal?: AbortSignal;
			setDocument: ReturnType<typeof vi.fn>;
			update: ReturnType<typeof vi.fn>;
		}>,
		loadingTask,
		pdfDocument,
	};
});

vi.mock("@/features/resume/export/pdf-document", () => ({
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
	pdfViewerMock.fetch.mockClear();
	vi.stubGlobal("fetch", pdfViewerMock.fetch);
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
		expect(pdfViewerMock.loadingTask.destroy).toHaveBeenCalledTimes(1);
	});

	it("renders a valid public projection through the shared PDF entrypoint", async () => {
		const semanticData = structuredClone(sampleResumeData);
		const applied = { languageVersion: 1, text: "@version 1;\nname { color: #123456; }\n" };
		semanticData.metadata.stylesheet = { mode: "semantic", source: applied, applied };
		const projection = await createPublicStyleProjection({ data: semanticData });
		const refetchStyleProjection = vi.fn();

		render(
			<PdfViewer
				data={sampleResumeData}
				stylesheetMode="semantic"
				styleProjection={projection}
				refetchStyleProjection={refetchStyleProjection}
				publicResume={{ username: "amruth", slug: "sample" }}
			/>,
		);

		await waitFor(() =>
			expect(pdfViewerMock.createResumePdfBlob).toHaveBeenCalledWith(sampleResumeData, undefined, undefined, {
				publicStyleProjection: projection,
			}),
		);
		expect(refetchStyleProjection).not.toHaveBeenCalled();
		expect(pdfViewerMock.fetch).not.toHaveBeenCalled();
	});

	it("refetches a mismatched projection once before using the authorized PDF fallback", async () => {
		const semanticData = structuredClone(sampleResumeData);
		const applied = { languageVersion: 1, text: "@version 1;\nname { color: #123456; }\n" };
		semanticData.metadata.stylesheet = { mode: "semantic", source: applied, applied };
		const projection = await createPublicStyleProjection({ data: semanticData });
		const mismatchedProjection = { ...projection, renderDataHash: "0".repeat(64) };
		const refetchStyleProjection = vi.fn(async () => mismatchedProjection);

		const view = render(
			<PdfViewer
				data={sampleResumeData}
				stylesheetMode="semantic"
				styleProjection={mismatchedProjection}
				refetchStyleProjection={refetchStyleProjection}
				publicResume={{ username: "amruth", slug: "sample" }}
			/>,
		);

		await waitFor(() => expect(refetchStyleProjection).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(pdfViewerMock.fetch).toHaveBeenCalledTimes(1));
		expect(String(pdfViewerMock.fetch.mock.calls[0]?.[0])).toContain("/api/resumes/amruth/sample/pdf");
		expect(String(pdfViewerMock.fetch.mock.calls[0]?.[0])).toContain("reason=render-data-hash");
		expect(pdfViewerMock.createResumePdfBlob).not.toHaveBeenCalled();

		view.rerender(
			<PdfViewer
				data={sampleResumeData}
				stylesheetMode="semantic"
				styleProjection={{ ...mismatchedProjection, renderDataHash: "1".repeat(64) }}
				refetchStyleProjection={refetchStyleProjection}
				publicResume={{ username: "amruth", slug: "sample" }}
			/>,
		);

		await waitFor(() => expect(pdfViewerMock.fetch).toHaveBeenCalledTimes(2));
		expect(refetchStyleProjection).toHaveBeenCalledTimes(1);
	});
});
