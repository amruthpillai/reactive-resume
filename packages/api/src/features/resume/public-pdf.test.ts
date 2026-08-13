import { describe, expect, it, vi } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createPublicResumePdf } from "./public-pdf";
import { createPublicRenderRateLimiter } from "./public-render-rate-limit";
import { getStyleProjection } from "./public-style-projection";

const requestHeaders = new Headers({ "x-forwarded-for": "203.0.113.7" });
const input = {
	username: "jane",
	slug: "resume",
	requestHeaders,
	trustedClient: "203.0.113.9",
	mismatchReason: "render-data-hash" as const,
};

const buildResume = (overrides: Partial<{ isPublic: boolean; passwordHash: string | null }> = {}) => ({
	id: "resume-1",
	userId: "owner-1",
	name: "Private dashboard title",
	slug: "resume",
	data: structuredClone(defaultResumeData),
	isPublic: overrides.isPublic ?? true,
	passwordHash: overrides.passwordHash ?? null,
});

const buildRendererUnsafeResume = () => {
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
	return resume;
};

describe("createPublicResumePdf", () => {
	it("rejects unbounded mismatch metadata before access or rendering", async () => {
		const findResume = vi.fn();

		await expect(
			createPublicResumePdf(
				{
					...input,
					mismatchReason: "private source" as typeof input.mismatchReason,
					clientRegistryFingerprint: "not-a-fingerprint",
				},
				{
					findResume,
					hasPasswordAccess: vi.fn(),
					resolveCurrentUserId: vi.fn(),
					rateLimiter: { consume: vi.fn() },
					renderPdf: vi.fn(),
					getFingerprints: vi.fn(),
					now: () => 0,
					observe: vi.fn(),
				},
			),
		).rejects.toMatchObject({ code: "BAD_REQUEST", status: 400 });
		expect(findResume).not.toHaveBeenCalled();
	});

	it("authorizes private and password-protected resumes before budget or render", async () => {
		const consume = vi.fn();
		const renderPdf = vi.fn();

		await expect(
			createPublicResumePdf(input, {
				findResume: vi.fn().mockResolvedValue(buildResume({ isPublic: false })),
				hasPasswordAccess: vi.fn(),
				resolveCurrentUserId: vi.fn().mockResolvedValue(undefined),
				rateLimiter: { consume },
				renderPdf,
				getFingerprints: vi.fn(),
				now: () => 0,
				observe: vi.fn(),
			}),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(consume).not.toHaveBeenCalled();
		expect(renderPdf).not.toHaveBeenCalled();

		await expect(
			createPublicResumePdf(input, {
				findResume: vi.fn().mockResolvedValue(buildResume({ passwordHash: "hash" })),
				hasPasswordAccess: vi.fn().mockReturnValue(false),
				resolveCurrentUserId: vi.fn().mockResolvedValue(undefined),
				rateLimiter: { consume },
				renderPdf,
				getFingerprints: vi.fn(),
				now: () => 0,
				observe: vi.fn(),
			}),
		).rejects.toMatchObject({ code: "NEED_PASSWORD" });
		expect(consume).not.toHaveBeenCalled();
		expect(renderPdf).not.toHaveBeenCalled();
	});

	it("rejects renderer-unsafe stored data before budget, projection metadata, or rendering", async () => {
		const consume = vi.fn();
		const renderPdf = vi.fn();
		const getFingerprints = vi.fn();

		await expect(
			createPublicResumePdf(input, {
				findResume: vi.fn().mockResolvedValue(buildRendererUnsafeResume()),
				hasPasswordAccess: vi.fn(),
				resolveCurrentUserId: vi.fn().mockResolvedValue(undefined),
				rateLimiter: { consume },
				renderPdf,
				getFingerprints,
				now: () => 0,
				observe: vi.fn(),
			}),
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });

		expect(consume).not.toHaveBeenCalled();
		expect(getFingerprints).not.toHaveBeenCalled();
		expect(renderPdf).not.toHaveBeenCalled();
	});

	it("shares the exact limiter with style projection", async () => {
		const limiter = createPublicRenderRateLimiter({ capacity: 1, refillWindowMs: 60_000, now: () => 0 });
		const findResume = vi.fn().mockResolvedValue(buildResume());
		const hasPasswordAccess = vi.fn();
		const projectionInput = {
			...input,
			requestHeaders: new Headers({ "x-forwarded-for": "198.51.100.1" }),
		};
		const pdfInput = {
			...input,
			requestHeaders: new Headers({ "x-forwarded-for": "198.51.100.2" }),
		};

		await getStyleProjection(projectionInput, {
			findResume,
			hasPasswordAccess,
			rateLimiter: limiter,
			createProjection: vi.fn().mockResolvedValue({
				formatVersion: 1,
				languageVersion: 1,
				semanticTreeVersion: 1,
				registryFingerprint: "0".repeat(64),
				adapterFingerprint: "1".repeat(64),
				renderDataHash: "2".repeat(64),
				nodes: {},
			}),
			cache: new Map(),
		});

		await expect(
			createPublicResumePdf(pdfInput, {
				findResume,
				hasPasswordAccess,
				resolveCurrentUserId: vi.fn().mockResolvedValue(undefined),
				rateLimiter: limiter,
				renderPdf: vi.fn(),
				getFingerprints: vi.fn(),
				now: () => 0,
				observe: vi.fn(),
			}),
		).rejects.toMatchObject({ code: "RATE_LIMIT_EXCEEDED" });
	});

	it("does not accept a caller-supplied owner identity for a private resume", async () => {
		const forgedInput = { ...input, currentUserId: "owner-1" };

		await expect(
			createPublicResumePdf(forgedInput, {
				findResume: vi.fn().mockResolvedValue(buildResume({ isPublic: false })),
				hasPasswordAccess: vi.fn(),
				resolveCurrentUserId: vi.fn().mockResolvedValue(undefined),
				rateLimiter: { consume: vi.fn() },
				renderPdf: vi.fn().mockResolvedValue(new File(["%PDF"], "resume.pdf")),
				getFingerprints: vi.fn().mockResolvedValue({
					registryFingerprint: "0".repeat(64),
					adapterFingerprint: "1".repeat(64),
				}),
				now: () => 0,
				observe: vi.fn(),
			}),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("propagates semantic diagnostics instead of returning an unstyled fallback PDF", async () => {
		const observe = vi.fn();
		const semanticError = new Error("The semantic stylesheet could not be rendered.", {
			cause: [{ code: "RESOURCE_LIMIT", severity: "error" }],
		});
		const renderPdf = vi.fn().mockRejectedValue(semanticError);

		await expect(
			createPublicResumePdf(input, {
				findResume: vi.fn().mockResolvedValue(buildResume()),
				hasPasswordAccess: vi.fn(),
				resolveCurrentUserId: vi.fn().mockResolvedValue(undefined),
				rateLimiter: { consume: vi.fn() },
				renderPdf,
				getFingerprints: vi.fn().mockResolvedValue({
					registryFingerprint: "0".repeat(64),
					adapterFingerprint: "1".repeat(64),
				}),
				now: () => 10,
				observe,
			}),
		).rejects.toBe(semanticError);

		expect(renderPdf).toHaveBeenCalledTimes(1);
		expect(observe).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
		expect(observe).not.toHaveBeenCalledWith(expect.objectContaining({ success: true }));
	});

	it("emits source-free, hashed fallback metadata", async () => {
		const sensitive = "Ada <ada@example.test> /* source */";
		const observe = vi.fn();
		let now = 10;
		const resume = buildResume();
		resume.id = sensitive;
		resume.data.basics.name = sensitive;
		resume.data.metadata.stylesheet = {
			mode: "semantic",
			source: { languageVersion: 1, text: sensitive },
			applied: { languageVersion: 1, text: sensitive },
		};

		await createPublicResumePdf(input, {
			findResume: vi.fn().mockResolvedValue(resume),
			hasPasswordAccess: vi.fn(),
			resolveCurrentUserId: vi.fn().mockResolvedValue(undefined),
			rateLimiter: { consume: vi.fn() },
			renderPdf: vi.fn().mockResolvedValue(new File(["%PDF"], "resume.pdf", { type: "application/pdf" })),
			getFingerprints: vi.fn().mockResolvedValue({
				registryFingerprint: "0".repeat(64),
				adapterFingerprint: "1".repeat(64),
			}),
			now: () => (now += 5),
			observe,
		});

		const serialized = JSON.stringify(observe.mock.calls);
		expect(observe).toHaveBeenCalledWith({
			name: "semantic_css.render_fallback",
			resumeIdHash: expect.stringMatching(/^[a-f0-9]{64}$/),
			mismatchReason: "render-data-hash",
			registryFingerprint: "0".repeat(64),
			adapterFingerprint: "1".repeat(64),
			durationMs: 5,
			success: true,
		});
		expect(serialized).not.toContain(sensitive);
		expect(serialized).not.toMatch(/source|comment|diagnostic|email/i);
	});
});
