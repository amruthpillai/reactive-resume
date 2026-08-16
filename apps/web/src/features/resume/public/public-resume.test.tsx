// @vitest-environment happy-dom

import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";

type PdfViewerProps = {
	className?: string;
	data: ResumeData;
	publicResume?: { username: string; slug: string };
};

const publicResumeMock = vi.hoisted(() => ({
	onDownloadPDF: vi.fn(),
	PdfViewer: vi.fn<(_props: PdfViewerProps) => ReactNode>(() => null),
	useResumeExport: vi.fn(),
	resume: undefined as
		| undefined
		| {
				data: ResumeData;
				name: string;
				slug: string;
		  },
}));

vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: publicResumeMock.resume }) }));
vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({ useParams: () => ({ username: "amruth", slug: "sample" }) }),
}));
vi.mock("./pdf-viewer", () => ({ PdfViewer: publicResumeMock.PdfViewer }));
vi.mock("@/libs/orpc/client", () => ({
	orpc: { resume: { getBySlug: { queryOptions: () => ({ query: "resume" }) } } },
}));
vi.mock("@/features/resume/export/use-resume-export", () => ({
	useResumeExport: publicResumeMock.useResumeExport,
}));

const { PublicResumeRoute } = await import("./public-resume");

beforeAll(() => i18n.loadAndActivate({ locale: "en", messages: {} }));

beforeEach(() => {
	publicResumeMock.resume = { data: sampleResumeData, name: "Sample Resume", slug: "sample" };
	publicResumeMock.PdfViewer.mockClear();
	publicResumeMock.useResumeExport.mockReset();
	publicResumeMock.useResumeExport.mockReturnValue({
		onDownloadPDF: publicResumeMock.onDownloadPDF,
		isExporting: false,
	});
	publicResumeMock.PdfViewer.mockImplementation(({ className }) => (
		<div className={className} data-testid="pdf-viewer" />
	));
});

const renderPublicResumeRoute = () =>
	render(
		<I18nProvider i18n={i18n}>
			<PublicResumeRoute />
		</I18nProvider>,
	);

describe("PublicResumeRoute", () => {
	it("passes exposed source data directly to the browser viewer and export fallback", () => {
		renderPublicResumeRoute();

		expect(publicResumeMock.PdfViewer).toHaveBeenCalledWith(
			expect.objectContaining({
				data: sampleResumeData,
				publicResume: { username: "amruth", slug: "sample" },
			}),
			undefined,
		);
		expect(publicResumeMock.useResumeExport).toHaveBeenCalledWith(publicResumeMock.resume, {
			publicResumePdf: { publicResume: { username: "amruth", slug: "sample" } },
		});
	});

	it("lets the public resume page grow to the full PDF length", () => {
		renderPublicResumeRoute();

		const viewerFrame = screen.getByTestId("pdf-viewer").parentElement;
		const page = viewerFrame?.parentElement;
		expect(page).not.toHaveClass("min-h-svh", "h-svh", "max-h-svh", "overflow-hidden");
		expect(viewerFrame).not.toHaveClass("min-h-0", "flex-1", "overflow-hidden");
	});
});
