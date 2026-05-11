// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import {
	DEFAULT_PDF_PAGE_SIZE,
	getResumePreviewPageCount,
	getScaledPreviewPageSize,
	ResumePreviewLoader,
} from "./preview.shared";

describe("ResumePreviewLoader", () => {
	it("uses the same scaled page dimensions as the preview page", () => {
		const pageScale = 1.25;
		const expectedSize = getScaledPreviewPageSize(DEFAULT_PDF_PAGE_SIZE, pageScale);
		const { container } = render(<ResumePreviewLoader pageScale={pageScale} />);

		const page = container.querySelector("figure > div") as HTMLElement | null;

		expect(Number.parseFloat(page?.style.height ?? "0")).toBeCloseTo(expectedSize.height);
		expect(Number.parseFloat(page?.style.width ?? "0")).toBeCloseTo(expectedSize.width);
	});

	it("renders one loading placeholder for each resume layout page", () => {
		const pageCount = sampleResumeData.metadata.layout.pages.length;

		render(<ResumePreviewLoader pageCount={pageCount} />);

		expect(screen.getAllByRole("img", { name: /Loading resume page/ })).toHaveLength(pageCount);
	});
});

describe("getResumePreviewPageCount", () => {
	it("uses the resume layout page count when resume data is available", () => {
		expect(getResumePreviewPageCount(sampleResumeData)).toBe(sampleResumeData.metadata.layout.pages.length);
	});

	it("falls back to one page without resume data", () => {
		expect(getResumePreviewPageCount()).toBe(1);
	});
});
