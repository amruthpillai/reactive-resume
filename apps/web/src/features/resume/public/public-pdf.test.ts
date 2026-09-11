import { beforeEach, describe, expect, it, vi } from "vitest";
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
	mocks.createResumePdfBlob.mockReset();
	mocks.createResumePdfBlob.mockResolvedValue(new Blob(["local"], { type: "application/pdf" }));
	mocks.fetch.mockReset();
	mocks.fetch.mockResolvedValue(new Response(new Blob(["server"], { type: "application/pdf" })));
	vi.stubGlobal("fetch", mocks.fetch);
});

describe("resolvePublicResumePdfBlob", () => {
	it("renders the exposed stylesheet source directly in the browser", async () => {
		const data = structuredClone(sampleResumeData);
		data.metadata.stylesheet = {
			mode: "semantic",
			source: { languageVersion: 1, text: "@version 1;\nname { color: #123456; }\n" },
		};

		const blob = await resolvePublicResumePdfBlob({ data, publicResume });

		expect(mocks.createResumePdfBlob).toHaveBeenCalledWith(data);
		expect(mocks.fetch).not.toHaveBeenCalled();
		expect(await blob.text()).toBe("local");
	});

	it("fetches the server PDF only after browser rendering rejects", async () => {
		mocks.createResumePdfBlob.mockRejectedValue(new Error("browser renderer failed"));

		const blob = await resolvePublicResumePdfBlob({ data: sampleResumeData, publicResume });

		expect(mocks.createResumePdfBlob).toHaveBeenCalledWith(sampleResumeData);
		expect(mocks.fetch).toHaveBeenCalledWith("/api/resumes/amruth/sample/pdf", { credentials: "include" });
		expect(await blob.text()).toBe("server");
	});
});
