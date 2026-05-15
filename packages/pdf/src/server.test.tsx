import type { SectionTitleResolver } from "./section-title";
import { Buffer } from "node:buffer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";

const rendererMock = vi.hoisted(() => ({
	renderToBuffer: vi.fn(async () => Buffer.from("%PDF")),
}));

vi.mock("@react-pdf/renderer", async (importOriginal) => ({
	...(await importOriginal<typeof import("@react-pdf/renderer")>()),
	renderToBuffer: rendererMock.renderToBuffer,
}));

vi.mock("./document", () => ({
	ResumeDocument: () => null,
}));

describe("createResumePdfFile", () => {
	beforeEach(() => {
		rendererMock.renderToBuffer.mockClear();
	});

	it("renders ResumeDocument with data, filename, template, and section title resolver", async () => {
		const resolveSectionTitle: SectionTitleResolver = (input) => input.defaultEnglishTitle ?? input.sectionId;
		const { createResumePdfFile } = await import("./server");

		const file = await createResumePdfFile({
			data: sampleResumeData,
			filename: "resume.pdf",
			template: "azurill",
			resolveSectionTitle,
		});

		expect(file.name).toBe("resume.pdf");
		expect(file.type).toBe("application/pdf");
		expect(await file.text()).toBe("%PDF");
		expect(rendererMock.renderToBuffer).toHaveBeenCalledTimes(1);
		expect(rendererMock.renderToBuffer).toHaveBeenCalledWith(
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
