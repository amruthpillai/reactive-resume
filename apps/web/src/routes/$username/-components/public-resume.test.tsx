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
	PdfViewer: vi.fn<(_props: { className?: string; data: ResumeData }) => ReactNode>(() => null),
	resume: undefined as
		| undefined
		| {
				data: ResumeData;
				name: string;
				slug: string;
		  },
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

vi.mock("./pdf-viewer", () => ({
	PdfViewer: publicResumeMock.PdfViewer,
}));

vi.mock("@/libs/orpc/client", () => ({
	orpc: { resume: { getBySlug: { queryOptions: () => ({}) } } },
}));

vi.mock("@/libs/resume/pdf-document", () => ({
	createResumePdfBlob: publicResumeMock.createResumePdfBlob,
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
	publicResumeMock.PdfViewer.mockClear();
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
	});

	it("lets the public resume page grow to the full PDF length", () => {
		renderPublicResumeRoute();

		const viewerFrame = screen.getByTestId("pdf-viewer").parentElement;
		const page = viewerFrame?.parentElement;

		expect(page).not.toHaveClass("min-h-svh", "h-svh", "max-h-svh", "overflow-hidden");
		expect(viewerFrame).not.toHaveClass("min-h-0", "flex-1", "overflow-hidden");
	});
});
