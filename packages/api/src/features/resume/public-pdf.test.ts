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

	it("shares the exact limiter with style projection", async () => {
		const limiter = createPublicRenderRateLimiter({ capacity: 1, refillWindowMs: 60_000, now: () => 0 });
		const findResume = vi.fn().mockResolvedValue(buildResume());
		const hasPasswordAccess = vi.fn();

		await getStyleProjection(input, {
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
			createPublicResumePdf(input, {
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

	it.each([
		[{ isPublic: true, passwordHash: null }, "public, max-age=300"],
		[{ isPublic: true, passwordHash: "hash" }, "private, no-store"],
		[{ isPublic: false, passwordHash: null }, "private, no-store"],
	] as const)("returns the correct cache policy for public/password/private access", async (access, cacheControl) => {
		const body = new File(["%PDF"], "resume.pdf", { type: "application/pdf" });
		const resume = buildResume(access);
		const currentUserId = access.isPublic ? undefined : "owner-1";
		const result = await createPublicResumePdf(
			{ ...input, ...(currentUserId ? { currentUserId } : {}) },
			{
				findResume: vi.fn().mockResolvedValue(resume),
				hasPasswordAccess: vi.fn().mockReturnValue(true),
				resolveCurrentUserId: vi.fn().mockResolvedValue(currentUserId),
				rateLimiter: { consume: vi.fn() },
				renderPdf: vi.fn().mockResolvedValue(body),
				getFingerprints: vi.fn().mockResolvedValue({
					registryFingerprint: "0".repeat(64),
					adapterFingerprint: "1".repeat(64),
				}),
				now: () => 10,
				observe: vi.fn(),
			},
		);

		expect(result.body).toBe(body);
		expect(result.cacheControl).toBe(cacheControl);
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
