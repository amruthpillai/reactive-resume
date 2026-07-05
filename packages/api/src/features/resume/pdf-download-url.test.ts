import { describe, expect, it, vi } from "vitest";

vi.mock("@reactive-resume/env/server", () => ({
	env: {
		APP_URL: "https://example.com/app/",
		AUTH_SECRET: "test-secret",
	},
}));

const { MAX_PDF_DOWNLOAD_URL_TTL_SECONDS, createResumePdfDownloadUrl, verifyResumePdfDownloadToken } = await import(
	"./pdf-download-url"
);

describe("resume PDF signed download URLs", () => {
	it("creates a URL with a token that is capped at 10 minutes", () => {
		const now = new Date("2026-06-01T10:00:00.000Z");

		const result = createResumePdfDownloadUrl({
			resumeId: "resume-1",
			userId: "user-1",
			now,
			ttlSeconds: 60 * 60,
		});

		const url = new URL(result.url);
		const token = url.searchParams.get("token");

		expect(MAX_PDF_DOWNLOAD_URL_TTL_SECONDS).toBe(600);
		expect(url.origin).toBe("https://example.com");
		expect(url.pathname).toBe("/api/resumes/resume-1/pdf");
		expect(token).toBeTruthy();
		expect(result.expiresInSeconds).toBe(600);
		expect(result.expiresAt).toBe("2026-06-01T10:10:00.000Z");
		if (!token) throw new Error("Expected signed URL token");

		expect(
			verifyResumePdfDownloadToken({
				resumeId: "resume-1",
				token,
				now: new Date("2026-06-01T10:09:59.000Z"),
			}),
		).toEqual({
			ok: true,
			resumeId: "resume-1",
			userId: "user-1",
			expiresAt: "2026-06-01T10:10:00.000Z",
		});
	});

	it("can include the cover letter target without changing token verification", () => {
		const result = createResumePdfDownloadUrl({
			resumeId: "resume-1",
			userId: "user-1",
			target: "cover-letter",
			now: new Date("2026-06-01T10:00:00.000Z"),
		});
		const url = new URL(result.url);
		const token = url.searchParams.get("token");

		expect(url.searchParams.get("target")).toBe("cover-letter");
		if (!token) throw new Error("Expected signed URL token");
		expect(
			verifyResumePdfDownloadToken({
				resumeId: "resume-1",
				token,
				now: new Date("2026-06-01T10:01:00.000Z"),
			}),
		).toMatchObject({ ok: true });
	});

	it("rejects expired, tampered, and mismatched tokens", () => {
		const result = createResumePdfDownloadUrl({
			resumeId: "resume-1",
			userId: "user-1",
			now: new Date("2026-06-01T10:00:00.000Z"),
		});
		const token = new URL(result.url).searchParams.get("token");
		if (!token) throw new Error("Expected signed URL token");

		expect(
			verifyResumePdfDownloadToken({
				resumeId: "resume-1",
				token,
				now: new Date("2026-06-01T10:10:01.000Z"),
			}),
		).toEqual({ ok: false, reason: "expired" });

		expect(
			verifyResumePdfDownloadToken({
				resumeId: "other-resume",
				token,
				now: new Date("2026-06-01T10:01:00.000Z"),
			}),
		).toEqual({ ok: false, reason: "resume_mismatch" });

		const tamperedToken = `${token.slice(0, -1)}${token.endsWith("x") ? "y" : "x"}`;

		expect(
			verifyResumePdfDownloadToken({
				resumeId: "resume-1",
				token: tamperedToken,
				now: new Date("2026-06-01T10:01:00.000Z"),
			}),
		).toEqual({ ok: false, reason: "invalid_signature" });
	});
});
