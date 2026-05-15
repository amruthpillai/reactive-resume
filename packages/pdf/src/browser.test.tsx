import type { SectionTitleResolver } from "./section-title";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";

const rendererMock = vi.hoisted(() => ({
	pdf: vi.fn(() => ({
		toBlob: vi.fn(async () => new Blob(["%PDF"], { type: "application/pdf" })),
	})),
}));

vi.mock("@react-pdf/renderer", async (importOriginal) => ({
	...(await importOriginal<typeof import("@react-pdf/renderer")>()),
	pdf: rendererMock.pdf,
}));

vi.mock("./document", () => ({
	ResumeDocument: () => null,
}));

describe("createResumePdfBlob", () => {
	beforeEach(() => {
		rendererMock.pdf.mockClear();
	});

	it("renders ResumeDocument with data, template, and section title resolver", async () => {
		const resolveSectionTitle: SectionTitleResolver = (input) => input.defaultEnglishTitle ?? input.sectionId;
		const { createResumePdfBlob } = await import("./browser");

		const blob = await createResumePdfBlob({
			data: sampleResumeData,
			template: "azurill",
			resolveSectionTitle,
		});

		expect(blob.type).toBe("application/pdf");
		expect(rendererMock.pdf).toHaveBeenCalledTimes(1);
		expect(rendererMock.pdf).toHaveBeenCalledWith(
			expect.objectContaining({
				props: {
					data: sampleResumeData,
					template: "azurill",
					resolveSectionTitle,
				},
			}),
		);
	});
});
