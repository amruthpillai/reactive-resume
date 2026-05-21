// @vitest-environment happy-dom

import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { ResumePreviewClient } from "./preview.browser";

const rendererMock = vi.hoisted(() => ({
	render: vi.fn((_files: Record<string, string>, _data: ResumeData) => "<html><body>Rendered</body></html>"),
}));

vi.mock("@reactive-resume/renderer", () => ({
	render: rendererMock.render,
}));

vi.mock("../builder/draft", () => ({
	useResumeData: () => undefined,
}));

describe("ResumePreviewClient (iframe)", () => {
	beforeEach(() => {
		rendererMock.render.mockReset();
		rendererMock.render.mockImplementation(() => "<html><body>Rendered</body></html>");
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

		// doRender is scheduled via setTimeout — with fake timers it hasn't fired yet
		expect(screen.getByLabelText(/Loading resume page 1 of/)).toBeTruthy();
	});

	it("renders the iframe after render() resolves", async () => {
		rendererMock.render.mockImplementation(() => "<html><body>Hello</body></html>");

		render(<ResumePreviewClient data={sampleResumeData} pageLayout="vertical" pageScale={1} showPageNumbers={false} />);

		const iframe = await screen.findByTitle("Resume preview");
		expect(iframe).toBeTruthy();
		expect(iframe).toHaveProperty("srcdoc", "<html><body>Hello</body></html>");
	});

	it("calls render() from @reactive-resume/renderer with correct arguments", async () => {
		rendererMock.render.mockImplementation(() => "<html><body>OK</body></html>");

		render(<ResumePreviewClient data={sampleResumeData} pageLayout="vertical" pageScale={1} showPageNumbers={false} />);

		await waitFor(() => {
			expect(rendererMock.render).toHaveBeenCalledTimes(1);
		});

		expect(rendererMock.render).toHaveBeenCalledWith(
			expect.any(Object), // files
			sampleResumeData, // data
			expect.any(Object), // templateMetadata
			expect.any(String), // templateId
			expect.any(String), // baseUrl
		);
	});

	it("returns null when no resume data is available", () => {
		const { container } = render(
			<ResumePreviewClient pageGap={16} pageLayout="horizontal" pageScale={1} showPageNumbers={false} />,
		);
		expect(container.firstChild).toBeNull();
	});
});
