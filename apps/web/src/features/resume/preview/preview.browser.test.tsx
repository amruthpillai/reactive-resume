// @vitest-environment happy-dom

import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { ResumePreviewClient } from "./preview.browser";

const previewMock = vi.hoisted(() => ({
	builderResumeData: undefined as ResumeData | undefined,
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

vi.mock("../builder/draft", () => ({
	useResumeData: () => previewMock.builderResumeData,
}));

vi.mock("./pdf-canvas", async () => {
	const React = await import("react");
	const pdfDocument = { numPages: 1 };

	return {
		PdfCanvasDocument: ({ children, onLoadSuccess }: PdfCanvasDocumentProps) => {
			React.useEffect(() => {
				onLoadSuccess(pdfDocument);
			}, [onLoadSuccess]);

			return React.createElement(React.Fragment, null, children(pdfDocument));
		},
		PdfCanvasPage: ({ onLoadSuccess, onRenderSuccess, pageNumber, totalPages }: PdfCanvasPageProps) => {
			React.useEffect(() => {
				onLoadSuccess(pageNumber, { height: 200, width: 100 });
				onRenderSuccess?.();
			}, [onLoadSuccess, onRenderSuccess, pageNumber]);

			return React.createElement(
				"div",
				{ role: "img", "aria-label": `Resume page ${pageNumber} of ${totalPages}` },
				"Rendered page",
			);
		},
	};
});

describe("ResumePreviewClient", () => {
	beforeEach(() => {
		previewMock.builderResumeData = undefined;
		previewMock.toBlob.mockReset();
		previewMock.toBlob.mockImplementation(async () => new Blob(["%PDF"], { type: "application/pdf" }));
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
});
