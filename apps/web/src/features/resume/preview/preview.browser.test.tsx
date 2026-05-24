// @vitest-environment happy-dom

import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { ResumePreviewClient } from "./preview.browser";

const rendererMock = vi.hoisted(() => ({
	render: vi.fn((_files: Record<string, string>, _data: ResumeData) => "<html><body>Rendered</body></html>"),
}));

const exportTemplateMock = vi.hoisted(() =>
	vi.fn(async () => ({
		files: { "index.html": "<html><head></head><body>Hello</body></html>" },
		metadata: { id: "azurill", name: "Azurill", sidebarPosition: "left", tags: [], fonts: [], typography: [] },
	})),
);

const centerViewMock = vi.hoisted(() => vi.fn());

vi.mock("@reactive-resume/renderer", () => ({
	render: rendererMock.render,
}));

vi.mock("@/libs/orpc/client", () => ({
	client: {
		templates: {
			exportTemplate: exportTemplateMock,
		},
	},
}));

vi.mock("react-zoom-pan-pinch", () => ({
	useControls: () => ({
		centerView: centerViewMock,
	}),
}));

vi.mock("../builder/draft", () => ({
	useResumeData: () => undefined,
}));

describe("ResumePreviewClient (iframe)", () => {
	beforeEach(() => {
		rendererMock.render.mockReset();
		rendererMock.render.mockImplementation(() => "<html><body>Hello</body></html>");
		exportTemplateMock.mockClear();
		centerViewMock.mockClear();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("shows a loading placeholder before the setTimeout fires", () => {
		vi.useFakeTimers();

		render(
			<ResumePreviewClient
				data={sampleResumeData}
				pageGap={16}
				pageLayout="vertical"
				pageScale={1}
				showPageNumbers={false}
			/>,
		);

		expect(screen.getByLabelText(/Loading resume page 1 of/)).toBeTruthy();
	});

	it("renders iframe pages after template export and render resolve", async () => {
		rendererMock.render.mockImplementation(() => "<html><head></head><body>Hello</body></html>");

		render(<ResumePreviewClient data={sampleResumeData} pageLayout="vertical" pageScale={1} showPageNumbers={false} />);

		const iframe = await screen.findByTitle("Resume page 1");
		expect(iframe).toBeTruthy();
		expect(iframe.getAttribute("srcdoc")).toContain("Hello");
		expect(iframe.getAttribute("srcdoc")).toContain("@page {");
		expect(iframe.getAttribute("srcdoc")).toContain("size: 595.28px 841.89px;");
		expect(iframe.getAttribute("srcdoc")).toContain("margin: 0;");
		expect(screen.getByTitle("Resume page 4")).toBeTruthy();
	});

	it("calls render() from @reactive-resume/renderer with correct arguments", async () => {
		render(<ResumePreviewClient data={sampleResumeData} pageLayout="vertical" pageScale={1} showPageNumbers={false} />);

		await waitFor(() => {
			expect(rendererMock.render).toHaveBeenCalledTimes(1);
		});

		expect(exportTemplateMock).toHaveBeenCalledWith({ id: sampleResumeData.metadata.template });
		expect(rendererMock.render).toHaveBeenCalledWith(
			expect.any(Object),
			sampleResumeData,
			expect.any(Object),
			expect.any(String),
			expect.any(String),
		);
	});

	it("re-centers the zoom viewport after the iframe stack renders", async () => {
		render(<ResumePreviewClient data={sampleResumeData} pageLayout="vertical" pageScale={1} showPageNumbers={false} />);

		await waitFor(() => {
			expect(centerViewMock).toHaveBeenCalledWith(undefined, 0);
		});
	});

	it("shrinks the iframe list when paged-ready reports fewer physical pages than the layout count", async () => {
		render(<ResumePreviewClient data={sampleResumeData} pageLayout="vertical" pageScale={1} showPageNumbers={false} />);

		await screen.findByTitle("Resume page 4");

		window.dispatchEvent(
			new MessageEvent("message", {
				data: { type: "paged-ready", count: 3 },
			}),
		);

		await waitFor(() => {
			expect(screen.queryByTitle("Resume page 4")).toBeNull();
		});
		expect(screen.getByTitle("Resume page 3")).toBeTruthy();
	});

	it("returns null when no resume data is available", () => {
		const { container } = render(
			<ResumePreviewClient pageGap={16} pageLayout="horizontal" pageScale={1} showPageNumbers={false} />,
		);
		expect(container.firstChild).toBeNull();
	});
});
