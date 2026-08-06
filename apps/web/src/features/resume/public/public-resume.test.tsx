// @vitest-environment happy-dom

import type { PublicStyleProjection } from "@reactive-resume/pdf/public-projection";
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
	stylesheetMode?: "legacy" | "semantic";
	styleProjection?: PublicStyleProjection;
	refetchStyleProjection?: () => Promise<PublicStyleProjection | undefined>;
	publicResume?: { username: string; slug: string };
};

const publicResumeMock = vi.hoisted(() => ({
	onDownloadPDF: vi.fn(),
	PdfViewer: vi.fn<(_props: PdfViewerProps) => ReactNode>(() => null),
	projection: {
		formatVersion: 1,
		languageVersion: 1,
		semanticTreeVersion: 1,
		registryFingerprint: "1".repeat(64),
		adapterFingerprint: "2".repeat(64),
		renderDataHash: "3".repeat(64),
		nodes: { resume: {} },
	} as PublicStyleProjection,
	refetchProjection: vi.fn(),
	projectionResult: {
		data: undefined as PublicStyleProjection | undefined,
		isError: false,
		isPending: false,
	},
	useResumeExport: vi.fn(),
	resume: undefined as
		| undefined
		| {
				data: ResumeData;
				name: string;
				slug: string;
				stylesheetMode: "legacy" | "semantic";
		  },
}));

vi.mock("@tanstack/react-query", () => ({
	useQuery: (options: { query: "resume" | "projection" }) =>
		options.query === "resume"
			? { data: publicResumeMock.resume }
			: { ...publicResumeMock.projectionResult, refetch: publicResumeMock.refetchProjection },
}));

vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({
		useParams: () => ({ username: "amruth", slug: "sample" }),
	}),
}));

vi.mock("./pdf-viewer", () => ({
	PdfViewer: publicResumeMock.PdfViewer,
}));

vi.mock("@/libs/orpc/client", () => ({
	orpc: {
		resume: {
			getBySlug: { queryOptions: () => ({ query: "resume" }) },
			getStyleProjection: { queryOptions: () => ({ query: "projection" }) },
		},
	},
}));

vi.mock("@/features/resume/export/use-resume-export", () => ({
	useResumeExport: publicResumeMock.useResumeExport,
}));

const { PublicResumeRoute } = await import("./public-resume");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

beforeEach(() => {
	publicResumeMock.resume = {
		data: sampleResumeData,
		name: "Sample Resume",
		slug: "sample",
		stylesheetMode: "semantic",
	};
	publicResumeMock.projectionResult = {
		data: publicResumeMock.projection,
		isError: false,
		isPending: false,
	};
	publicResumeMock.PdfViewer.mockClear();
	publicResumeMock.refetchProjection.mockReset();
	publicResumeMock.refetchProjection.mockResolvedValue({ data: publicResumeMock.projection });
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
	it("renders the public resume through the route-local PDF.js viewer", () => {
		renderPublicResumeRoute();

		expect(screen.getByTestId("pdf-viewer")).toHaveClass("block", "w-full");
		expect(publicResumeMock.PdfViewer).toHaveBeenCalledWith(
			expect.objectContaining({ data: sampleResumeData }),
			undefined,
		);
		expect(publicResumeMock.useResumeExport).toHaveBeenCalledWith(publicResumeMock.resume, {
			publicResumePdf: expect.objectContaining({
				stylesheetMode: "semantic",
				styleProjection: publicResumeMock.projection,
				publicResume: { username: "amruth", slug: "sample" },
			}),
		});
	});

	it("routes a missing semantic projection to the shared fallback seam", () => {
		publicResumeMock.projectionResult = { data: undefined, isError: true, isPending: false };

		renderPublicResumeRoute();

		expect(publicResumeMock.PdfViewer).toHaveBeenCalledWith(
			expect.objectContaining({
				stylesheetMode: "semantic",
				styleProjection: undefined,
				refetchStyleProjection: expect.any(Function),
				publicResume: { username: "amruth", slug: "sample" },
			}),
			undefined,
		);
		expect(publicResumeMock.useResumeExport).toHaveBeenCalledWith(
			publicResumeMock.resume,
			expect.objectContaining({
				publicResumePdf: expect.objectContaining({
					stylesheetMode: "semantic",
				}),
			}),
		);
	});

	it("keeps missing legacy projections on the local rendering path", () => {
		if (publicResumeMock.resume) publicResumeMock.resume.stylesheetMode = "legacy";
		publicResumeMock.projectionResult = { data: undefined, isError: false, isPending: false };

		renderPublicResumeRoute();

		expect(publicResumeMock.PdfViewer).toHaveBeenCalledWith(
			expect.objectContaining({ stylesheetMode: "legacy", styleProjection: undefined }),
			undefined,
		);
	});

	it("loads the public projection and passes it to the shared viewer", () => {
		renderPublicResumeRoute();

		expect(publicResumeMock.PdfViewer).toHaveBeenCalledWith(
			expect.objectContaining({
				styleProjection: publicResumeMock.projection,
				refetchStyleProjection: expect.any(Function),
				publicResume: { username: "amruth", slug: "sample" },
			}),
			undefined,
		);
	});

	it("lets the public resume page grow to the full PDF length", () => {
		renderPublicResumeRoute();

		const viewerFrame = screen.getByTestId("pdf-viewer").parentElement;
		const page = viewerFrame?.parentElement;

		expect(page).not.toHaveClass("min-h-svh", "h-svh", "max-h-svh", "overflow-hidden");
		expect(viewerFrame).not.toHaveClass("min-h-0", "flex-1", "overflow-hidden");
	});
});
