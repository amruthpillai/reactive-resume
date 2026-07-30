import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPublicStyleProjection } from "@reactive-resume/pdf/public-projection";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { resolvePublicResumePdfBlob } from "./public-pdf";

const mocks = vi.hoisted(() => ({
	createResumePdfBlob: vi.fn(async () => new Blob(["local"], { type: "application/pdf" })),
	fetch: vi.fn(async (_input: string | URL) => new Response(new Blob(["server"], { type: "application/pdf" }))),
}));

vi.mock("@/features/resume/export/pdf-document", () => ({
	createResumePdfBlob: mocks.createResumePdfBlob,
}));

const publicResume = { username: "amruth", slug: "sample" };

beforeEach(() => {
	mocks.createResumePdfBlob.mockClear();
	mocks.fetch.mockClear();
	vi.stubGlobal("fetch", mocks.fetch);
});

describe("resolvePublicResumePdfBlob", () => {
	it("keeps legitimate legacy resumes on the local PDF path", async () => {
		await resolvePublicResumePdfBlob({
			data: sampleResumeData,
			stylesheetMode: "legacy",
			publicResume,
		});

		expect(mocks.createResumePdfBlob).toHaveBeenCalledWith(sampleResumeData);
		expect(mocks.fetch).not.toHaveBeenCalled();
	});

	it("uses the authorized server fallback when a semantic projection is unavailable", async () => {
		const refetchStyleProjection = vi.fn().mockRejectedValue(new Error("projection unavailable"));

		await resolvePublicResumePdfBlob({
			data: sampleResumeData,
			stylesheetMode: "semantic",
			publicResume,
			refetchStyleProjection,
		});

		expect(refetchStyleProjection).toHaveBeenCalledTimes(1);
		expect(String(mocks.fetch.mock.calls[0]?.[0])).toContain("/api/resumes/amruth/sample/pdf");
		expect(String(mocks.fetch.mock.calls[0]?.[0])).toContain("reason=missing-projection");
		expect(mocks.createResumePdfBlob).not.toHaveBeenCalled();
	});

	it("refetches a mismatched projection once before returning the authorized server blob", async () => {
		const semanticData = structuredClone(sampleResumeData);
		const source = { languageVersion: 1, text: "@version 1;\nname { color: #123456; }\n" };
		semanticData.metadata.stylesheet = { mode: "semantic", source, applied: source };
		const projection = await createPublicStyleProjection({ data: semanticData });
		const mismatchedProjection = { ...projection, renderDataHash: "0".repeat(64) };
		const refetchStyleProjection = vi.fn(async () => mismatchedProjection);

		const blob = await resolvePublicResumePdfBlob({
			data: sampleResumeData,
			stylesheetMode: "semantic",
			styleProjection: mismatchedProjection,
			publicResume,
			refetchStyleProjection,
		});

		expect(refetchStyleProjection).toHaveBeenCalledTimes(1);
		expect(mocks.fetch).toHaveBeenCalledTimes(1);
		expect(await blob.text()).toBe("server");
		expect(mocks.createResumePdfBlob).not.toHaveBeenCalled();
	});
});
