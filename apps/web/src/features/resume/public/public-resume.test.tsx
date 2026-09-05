// @vitest-environment happy-dom

import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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
	flags: { disableSignups: false },
	onDownloadPDF: vi.fn(),
	PdfViewer: vi.fn<(_props: PdfViewerProps) => ReactNode>(() => null),
	useResumeExport: vi.fn(),
	resume: undefined as
		| undefined
		| {
				data: ResumeData;
				name: string;
				slug: string;
				showDownloadButtons?: boolean;
		  },
}));

vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: publicResumeMock.resume }) }));
vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({
		useParams: () => ({ username: "amruth", slug: "sample" }),
		useRouteContext: () => ({ flags: publicResumeMock.flags }),
	}),
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
	publicResumeMock.flags.disableSignups = false;
	publicResumeMock.resume = { data: sampleResumeData, name: "Sample Resume", slug: "sample" };
	publicResumeMock.PdfViewer.mockClear();
	publicResumeMock.onDownloadPDF.mockClear();
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
	it("shows the create-resume link when registration is enabled", () => {
		renderPublicResumeRoute();

		expect(screen.getByRole("link", { name: /Build your own resume/ })).toHaveAttribute("href", "/");
	});

	it("hides the create-resume link when registration is disabled", () => {
		publicResumeMock.flags.disableSignups = true;
		renderPublicResumeRoute();

		expect(screen.queryByRole("link", { name: /Build your own resume/ })).not.toBeInTheDocument();
		expect(screen.getByTestId("pdf-viewer")).toBeInTheDocument();
	});

	it("shows both working download controls by default", () => {
		renderPublicResumeRoute();
		const buttons = screen.getAllByRole("button", { name: "Download PDF" });
		expect(buttons).toHaveLength(2);
		for (const button of buttons) fireEvent.click(button);
		expect(publicResumeMock.onDownloadPDF).toHaveBeenCalledTimes(2);
	});

	it("hides both download controls while keeping the public PDF visible", () => {
		publicResumeMock.resume = { data: sampleResumeData, name: "Sample", slug: "sample", showDownloadButtons: false };
		renderPublicResumeRoute();
		expect(screen.queryByRole("button", { name: "Download PDF" })).not.toBeInTheDocument();
		expect(screen.getByTestId("pdf-viewer")).toBeVisible();
	});

	it("shows both controls when the owner enables downloads again", () => {
		publicResumeMock.resume = { data: sampleResumeData, name: "Sample", slug: "sample", showDownloadButtons: true };
		renderPublicResumeRoute();
		expect(screen.getAllByRole("button", { name: "Download PDF" })).toHaveLength(2);
	});

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
