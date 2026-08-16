import { describe, expect, it, vi } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createPublicResumePdf } from "./public-pdf";

const requestHeaders = new Headers({ "x-forwarded-for": "203.0.113.7" });
const input = {
	username: "jane",
	slug: "resume",
	requestHeaders,
	trustedClient: "203.0.113.9",
};

const buildResume = (overrides: Partial<{ isPublic: boolean; passwordHash: string | null }> = {}) => ({
	id: "resume-1",
	userId: "owner-1",
	data: structuredClone(defaultResumeData),
	isPublic: overrides.isPublic ?? true,
	passwordHash: overrides.passwordHash ?? null,
});

const dependencies = (resume = buildResume()) => ({
	findResume: vi.fn().mockResolvedValue(resume),
	hasPasswordAccess: vi.fn().mockReturnValue(true),
	resolveCurrentUserId: vi.fn().mockResolvedValue(undefined),
	rateLimiter: { consume: vi.fn() },
	renderPdf: vi.fn().mockResolvedValue(new File(["%PDF"], "resume.pdf", { type: "application/pdf" })),
});

describe("createPublicResumePdf", () => {
	it("authorizes private and password-protected resumes before budget or render", async () => {
		const privateDependencies = dependencies(buildResume({ isPublic: false }));
		await expect(createPublicResumePdf(input, privateDependencies)).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(privateDependencies.rateLimiter.consume).not.toHaveBeenCalled();
		expect(privateDependencies.renderPdf).not.toHaveBeenCalled();

		const passwordDependencies = dependencies(buildResume({ passwordHash: "hash" }));
		passwordDependencies.hasPasswordAccess.mockReturnValue(false);
		await expect(createPublicResumePdf(input, passwordDependencies)).rejects.toMatchObject({ code: "NEED_PASSWORD" });
		expect(passwordDependencies.rateLimiter.consume).not.toHaveBeenCalled();
		expect(passwordDependencies.renderPdf).not.toHaveBeenCalled();
	});

	it("rejects renderer-unsafe stored data before budget or rendering", async () => {
		const resume = buildResume();
		resume.data.customSections = [
			{
				id: "custom-experience",
				type: "experience",
				title: "Experience",
				icon: "",
				columns: 1,
				hidden: false,
				keepTogether: false,
				startOnNewPage: false,
				items: [{ id: "summary-shaped-item", hidden: false, content: "<p>Missing company</p>" }],
			} as never,
		];
		const unsafeDependencies = dependencies(resume);

		await expect(createPublicResumePdf(input, unsafeDependencies)).rejects.toMatchObject({
			code: "INTERNAL_SERVER_ERROR",
		});
		expect(unsafeDependencies.rateLimiter.consume).not.toHaveBeenCalled();
		expect(unsafeDependencies.renderPdf).not.toHaveBeenCalled();
	});

	it("renders on demand with canonical public stylesheet source", async () => {
		const resume = buildResume();
		resume.data.basics.name = "Ada Lovelace";
		resume.data.metadata.stylesheet = {
			mode: "semantic",
			source: { languageVersion: 1, text: "@version 1;\nname { color: blue; }\n" },
		};
		const pdfDependencies = dependencies(resume);

		const result = await createPublicResumePdf(input, pdfDependencies);

		expect(result.filename).toBe("ada-lovelace.pdf");
		expect(pdfDependencies.rateLimiter.consume).toHaveBeenCalledWith({
			trustedClient: input.trustedClient,
			resumeId: resume.id,
		});
		expect(pdfDependencies.renderPdf).toHaveBeenCalledWith({ data: resume.data, filename: "ada-lovelace.pdf" });
	});

	it("preserves ordinary renderer failures", async () => {
		const rendererError = new Error("renderer failed");
		const pdfDependencies = dependencies();
		pdfDependencies.renderPdf.mockRejectedValue(rendererError);

		await expect(createPublicResumePdf(input, pdfDependencies)).rejects.toBe(rendererError);
	});
});
