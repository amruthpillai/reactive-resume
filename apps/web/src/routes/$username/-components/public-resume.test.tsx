// @vitest-environment happy-dom

import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";

const publicResumeMock = vi.hoisted(() => ({
	createResumePdfBlob: vi.fn(async () => new Blob(["%PDF"], { type: "application/pdf" })),
	downloadWithAnchor: vi.fn(),
	generateFilename: vi.fn((name: string, extension: string) => `${name}.${extension}`),
	PDFViewer: vi.fn<(_props: { children: ReactNode; showToolbar?: boolean; title?: string }) => ReactNode>(() => null),
	resume: undefined as
		| undefined
		| {
				data: ResumeData;
				name: string;
				slug: string;
		  },
	ResumePreview: vi.fn<() => ReactNode>(() => null),
	useLocalizedResumeDocument: vi.fn<(data?: ResumeData) => ReactNode>(() => null),
}));

vi.mock("@react-pdf/renderer", () => ({
	PDFViewer: publicResumeMock.PDFViewer,
}));

vi.mock("@tanstack/react-query", () => ({
	useQuery: () => ({ data: publicResumeMock.resume }),
}));

vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({
		useParams: () => ({ username: "amruth", slug: "sample" }),
	}),
}));

vi.mock("@reactive-resume/utils/file", () => ({
	downloadWithAnchor: publicResumeMock.downloadWithAnchor,
	generateFilename: publicResumeMock.generateFilename,
}));

vi.mock("@/components/resume/preview", () => ({
	ResumePreview: publicResumeMock.ResumePreview,
}));

vi.mock("@/libs/orpc/client", () => ({
	orpc: { resume: { getBySlug: { queryOptions: () => ({}) } } },
}));

vi.mock("@/libs/resume/pdf-document", () => ({
	createResumePdfBlob: publicResumeMock.createResumePdfBlob,
	useLocalizedResumeDocument: publicResumeMock.useLocalizedResumeDocument,
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
	};
	publicResumeMock.PDFViewer.mockClear();
	publicResumeMock.ResumePreview.mockClear();
	publicResumeMock.useLocalizedResumeDocument.mockClear();
	publicResumeMock.PDFViewer.mockImplementation(({ children, showToolbar, title }) => (
		<div data-testid="public-pdf-viewer" data-show-toolbar={String(showToolbar)} title={title}>
			{children}
		</div>
	));
	publicResumeMock.ResumePreview.mockImplementation(() => <div data-testid="shared-resume-preview" />);
	publicResumeMock.useLocalizedResumeDocument.mockImplementation(() => <div data-testid="resume-document" />);
});

const renderPublicResumeRoute = () =>
	render(
		<I18nProvider i18n={i18n}>
			<PublicResumeRoute />
		</I18nProvider>,
	);

describe("PublicResumeRoute", () => {
	it("renders the public resume through a toolbarless browser PDF viewer", () => {
		renderPublicResumeRoute();

		expect(screen.getByTestId("public-pdf-viewer")).toHaveAttribute("data-show-toolbar", "false");
		expect(screen.getByTestId("resume-document")).toBeInTheDocument();
		expect(screen.queryByTestId("shared-resume-preview")).not.toBeInTheDocument();
		expect(publicResumeMock.useLocalizedResumeDocument).toHaveBeenCalledWith(sampleResumeData);
	});

	it("caps the public resume page to the viewport without document overflow", () => {
		renderPublicResumeRoute();

		const viewerFrame = screen.getByTestId("public-pdf-viewer").parentElement;
		const page = viewerFrame?.parentElement;

		expect(page).toHaveClass("h-svh", "max-h-svh", "overflow-hidden");
		expect(viewerFrame).toHaveClass("min-h-0", "flex-1", "overflow-hidden");
	});
});
