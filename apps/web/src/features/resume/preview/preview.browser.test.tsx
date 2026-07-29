// @vitest-environment happy-dom

import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { ResumePreviewClient } from "./preview.browser";

const previewMock = vi.hoisted(() => ({
	builderResumeId: undefined as string | undefined,
	builderResumeData: undefined as ResumeData | undefined,
	stylesheet: {
		resumeId: undefined as string | undefined,
		mode: "legacy" as "legacy" | "semantic",
		source: { languageVersion: 1, text: "@rr-version 1;\n" },
		applied: { languageVersion: 1, text: "@rr-version 1;\n" },
	},
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
	useResumeStore: (selector: (state: { resumeId?: string }) => unknown) =>
		selector({ resumeId: previewMock.builderResumeId }),
	usePreviewPausedStore: (selector: (state: { paused: boolean }) => unknown) => selector({ paused: false }),
}));

vi.mock("@/features/resume/stylesheet/store", () => ({
	useStylesheetStore: (
		selector: (state: {
			resumeId?: string;
			mode: "legacy" | "semantic";
			source: { languageVersion: number; text: string };
			applied: { languageVersion: number; text: string };
		}) => unknown,
	) => selector(previewMock.stylesheet),
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
		previewMock.builderResumeId = undefined;
		previewMock.builderResumeData = undefined;
		previewMock.stylesheet = {
			resumeId: undefined,
			mode: "legacy",
			source: { languageVersion: 1, text: "@rr-version 1;\n" },
			applied: { languageVersion: 1, text: "@rr-version 1;\n" },
		};
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

		expect(previewMock.toBlob).toHaveBeenCalledWith(sampleResumeData, undefined, undefined, undefined);
	});

	it("renders the canonical applied stylesheet and ignores invalid editable source", async () => {
		const validApplied = { languageVersion: 1, text: "@rr-version 1;\nname { color: #123456; }\n" };
		previewMock.builderResumeId = "resume-1";
		previewMock.builderResumeData = sampleResumeData;
		previewMock.stylesheet = {
			resumeId: "resume-1",
			mode: "semantic",
			source: { languageVersion: 1, text: "section {" },
			applied: validApplied,
		};

		render(<ResumePreviewClient pageLayout="vertical" pageScale={1.25} showPageNumbers={false} />);

		await waitFor(() => expect(previewMock.toBlob).toHaveBeenCalledTimes(1));
		expect(previewMock.toBlob).toHaveBeenCalledWith(sampleResumeData, undefined, undefined, {
			stylesheet: { mode: "semantic", applied: validApplied },
		});

		expect(previewMock.toBlob).toHaveBeenCalledTimes(1);
	});

	it("keeps the active PDF visible and reports a later render failure", async () => {
		previewMock.builderResumeId = "resume-1";
		previewMock.builderResumeData = sampleResumeData;
		previewMock.stylesheet = {
			resumeId: "resume-1",
			mode: "semantic",
			source: { languageVersion: 1, text: "@rr-version 1;\n" },
			applied: { languageVersion: 1, text: "@rr-version 1;\nname { color: #123456; }\n" },
		};
		const view = render(<ResumePreviewClient pageLayout="vertical" pageScale={1.25} showPageNumbers={false} />);
		expect(await screen.findByRole("img", { name: "Resume page 1 of 1" })).toBeTruthy();

		previewMock.toBlob.mockRejectedValueOnce(new Error("render failed"));
		previewMock.stylesheet.applied = {
			languageVersion: 1,
			text: "@rr-version 1;\nname { color: #654321; }\n",
		};
		view.rerender(<ResumePreviewClient pageLayout="vertical" pageScale={1.25} showPageNumbers={false} />);

		await waitFor(() => expect(previewMock.toBlob).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(previewMock.toastError).toHaveBeenCalledTimes(1));
		expect(screen.getByRole("img", { name: "Resume page 1 of 1" })).toBeTruthy();
	});
});
