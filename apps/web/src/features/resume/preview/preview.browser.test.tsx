// @vitest-environment happy-dom

import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { ResumePreviewClient } from "./preview.browser";

const previewMock = vi.hoisted(() => ({
	builderResumeData: undefined as ResumeData | undefined,
	toastError: vi.fn(),
	toBlob: vi.fn(async () => new Blob(["%PDF"], { type: "application/pdf" })),
}));

type PdfCanvasDocumentProps = {
	children: (document: { numPages: number }) => React.ReactNode;
	onLoadSuccess: (document: { numPages: number }) => void;
};

type PdfCanvasPageProps = {
	onLoadSuccess: (pageNumber: number, pageSize: { height: number; width: number }) => void;
	onRenderSuccess?: () => void;
	pageNumber: number;
	totalPages: number;
};

const resumeDataWithPageCount = (pageCount: number): ResumeData => ({
	...sampleResumeData,
	metadata: {
		...sampleResumeData.metadata,
		layout: {
			...sampleResumeData.metadata.layout,
			pages: sampleResumeData.metadata.layout.pages.slice(0, pageCount),
		},
	},
});

vi.mock("@/features/resume/export/pdf-document", () => ({
	createResumePdfBlob: previewMock.toBlob,
}));

vi.mock("sonner", () => ({
	toast: { error: previewMock.toastError },
}));

vi.mock("../builder/draft", () => ({
	useResumeData: () => previewMock.builderResumeData,
	usePreviewPausedStore: (selector: (state: { paused: boolean }) => unknown) => selector({ paused: false }),
}));

vi.mock("./pdf-canvas", async () => {
	const React = await import("react");
	const pdfDocument = { numPages: 1 };

	return {
		PdfCanvasDocument: ({ children, onLoadSuccess }: PdfCanvasDocumentProps) => {
			React.useEffect(() => {
				onLoadSuccess(pdfDocument);
			}, []);

			return React.createElement(React.Fragment, null, children(pdfDocument));
		},
		PdfCanvasPage: ({ onLoadSuccess, onRenderSuccess, pageNumber, totalPages }: PdfCanvasPageProps) => {
			React.useEffect(() => {
				onLoadSuccess(pageNumber, { height: 200, width: 100 });
				onRenderSuccess?.();
			}, [pageNumber]);

			return React.createElement(
				"div",
				{ role: "img", "aria-label": `Resume page ${pageNumber} of ${totalPages}` },
				"Rendered page",
			);
		},
	};
});

describe("ResumePreviewClient", () => {
	beforeAll(() => {
		i18n.loadAndActivate({ locale: "en", messages: {} });
	});

	beforeEach(() => {
		previewMock.builderResumeData = undefined;
		previewMock.toBlob.mockReset();
		previewMock.toBlob.mockImplementation(async () => new Blob(["%PDF"], { type: "application/pdf" }));
		previewMock.toastError.mockReset();
	});

	it("renders a loading placeholder for each builder layout page while the PDF is generated", () => {
		previewMock.builderResumeData = resumeDataWithPageCount(3);
		previewMock.toBlob.mockImplementation(() => new Promise<Blob>(() => {}));

		render(<ResumePreviewClient pageGap={16} pageLayout="vertical" pageScale={1.25} showPageNumbers={false} />);

		expect(screen.getAllByRole("img", { name: /Loading resume page/ })).toHaveLength(3);
	});

	it("renders from explicit resume data when no builder resume is active", async () => {
		render(
			<ResumePreviewClient data={sampleResumeData} pageLayout="vertical" pageScale={1.25} showPageNumbers={false} />,
		);

		expect(await screen.findByRole("img", { name: "Resume page 1 of 1" })).toBeTruthy();

		await waitFor(() => {
			expect(previewMock.toBlob).toHaveBeenCalledTimes(1);
		});

		expect(previewMock.toBlob).toHaveBeenCalledWith(sampleResumeData);
	});

	it("keeps the rendered template identity on the active layer while its replacement renders", async () => {
		const view = render(
			<ResumePreviewClient data={sampleResumeData} pageLayout="vertical" pageScale={1.25} showPageNumbers={false} />,
		);
		const page = await screen.findByRole("img", { name: "Resume page 1 of 1" });
		const activeLayer = page.closest('[aria-hidden="false"]');
		expect(activeLayer?.getAttribute("data-resume-preview-template")).toBe("azurill");

		previewMock.toBlob.mockImplementationOnce(() => new Promise<Blob>(() => {}));
		const glalieData: ResumeData = {
			...sampleResumeData,
			metadata: { ...sampleResumeData.metadata, template: "glalie" },
		};
		view.rerender(
			<ResumePreviewClient data={glalieData} pageLayout="vertical" pageScale={1.25} showPageNumbers={false} />,
		);

		await waitFor(() => expect(previewMock.toBlob).toHaveBeenCalledTimes(2));
		expect(activeLayer?.getAttribute("data-resume-preview-template")).toBe("azurill");
	});

	it("renders the current stylesheet source from the ordinary builder draft", async () => {
		const source = { languageVersion: 1, text: "section {" };
		previewMock.builderResumeData = {
			...sampleResumeData,
			metadata: {
				...sampleResumeData.metadata,
				stylesheet: { mode: "semantic", source },
			},
		};

		render(<ResumePreviewClient pageLayout="vertical" pageScale={1.25} showPageNumbers={false} />);

		await waitFor(() => expect(previewMock.toBlob).toHaveBeenCalledTimes(1));
		expect(previewMock.toBlob).toHaveBeenCalledWith(previewMock.builderResumeData);

		expect(previewMock.toBlob).toHaveBeenCalledTimes(1);
	});

	it("keeps the active PDF visible and reports a later renderer failure", async () => {
		previewMock.builderResumeData = sampleResumeData;
		const view = render(<ResumePreviewClient pageLayout="vertical" pageScale={1.25} showPageNumbers={false} />);
		expect(await screen.findByRole("img", { name: "Resume page 1 of 1" })).toBeTruthy();

		previewMock.toBlob.mockRejectedValueOnce(new Error("PDF renderer failed"));
		previewMock.builderResumeData = {
			...sampleResumeData,
			metadata: {
				...sampleResumeData.metadata,
				stylesheet: {
					mode: "semantic",
					source: { languageVersion: 1, text: "@version 1;\nname { color: #654321; }\n" },
				},
			},
		};
		view.rerender(<ResumePreviewClient pageLayout="vertical" pageScale={1.25} showPageNumbers={false} />);

		await waitFor(() => expect(previewMock.toBlob).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(previewMock.toastError).toHaveBeenCalledTimes(1));
		expect(screen.getByRole("img", { name: "Resume page 1 of 1" })).toBeTruthy();
	});
});
