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

	it("returns a rejected Promise when the renderer fails synchronously", async () => {
		rendererMock.pdf.mockImplementationOnce(() => {
			throw new Error("renderer failed");
		});
		const { createResumePdfBlob } = await import("./browser");

		const promise = createResumePdfBlob({ data: sampleResumeData });

		expect(promise).toBeInstanceOf(Promise);
		await expect(promise).rejects.toThrow("renderer failed");
	});

	it("returns semantic diagnostics without rendering an invalid applied source", async () => {
		const data = structuredClone(sampleResumeData);
		const invalid = { languageVersion: 1, text: "@rr-version 1; section { color: ; }" };
		data.metadata.stylesheet = { mode: "semantic", source: invalid, applied: invalid };
		const { createResumePdfBlobResult } = await import("./browser");

		const result = await createResumePdfBlobResult({ data });

		expect(result).toMatchObject({
			ok: false,
			diagnostics: [expect.objectContaining({ severity: "error" })],
		});
		expect(rendererMock.pdf).not.toHaveBeenCalled();
	});

	it("accepts an optional prior semantic inspection on the result path", async () => {
		const { createResumePdfBlobResult } = await import("./browser");
		const inspection = {
			presentation: {},
			sourceTree: { key: "resume", kind: "resume", attributes: {}, roles: [], children: [] },
			renderTree: { key: "resume", kind: "resume", attributes: {}, roles: [], children: [] },
			diagnostics: [],
		} as const;

		const result = await createResumePdfBlobResult({ data: sampleResumeData, inspection });

		expect(result).toMatchObject({ ok: true, diagnostics: [] });
		expect(rendererMock.pdf).toHaveBeenCalledTimes(1);
	});
});
