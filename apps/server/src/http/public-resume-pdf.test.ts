import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	createPublicResumePdf: vi.fn(),
}));

vi.mock("@reactive-resume/api/features/resume/public-pdf", () => ({
	createPublicResumePdf: mocks.createPublicResumePdf,
	PUBLIC_RESUME_PDF_MISMATCH_REASONS: [
		"missing-projection",
		"format-version",
		"language-version",
		"semantic-tree-version",
		"registry-fingerprint",
		"adapter-fingerprint",
		"render-data-hash",
		"invalid-projection",
	],
}));

const { handlePublicResumePdf } = await import("./public-resume-pdf");

describe("handlePublicResumePdf", () => {
	beforeEach(() => vi.clearAllMocks());

	it("returns the authorized fallback PDF with strict mismatch metadata and cache policy", async () => {
		const body = new File(["%PDF"], "Ada_Lovelace.pdf", { type: "application/pdf" });
		mocks.createPublicResumePdf.mockResolvedValueOnce({
			body,
			filename: "Ada_Lovelace.pdf",
			cacheControl: "public, max-age=300",
		});
		const registry = "0".repeat(64);
		const adapter = "1".repeat(64);
		const request = new Request(
			`https://example.com/api/resumes/jane/resume/pdf?reason=render-data-hash&registryFingerprint=${registry}&adapterFingerprint=${adapter}`,
			{ headers: { "x-forwarded-for": "203.0.113.7" } },
		);

		const response = await handlePublicResumePdf(request, "jane", "resume");

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/pdf");
		expect(response.headers.get("Content-Disposition")).toBe('inline; filename="Ada_Lovelace.pdf"');
		expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
		expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(await response.text()).toBe("%PDF");
		expect(mocks.createPublicResumePdf).toHaveBeenCalledWith({
			username: "jane",
			slug: "resume",
			requestHeaders: request.headers,
			mismatchReason: "render-data-hash",
			clientRegistryFingerprint: registry,
			clientAdapterFingerprint: adapter,
		});
	});

	it("defaults a missing mismatch reason and keeps password/private responses uncacheable", async () => {
		mocks.createPublicResumePdf.mockResolvedValueOnce({
			body: new File(["%PDF"], "resume.pdf", { type: "application/pdf" }),
			filename: "resume.pdf",
			cacheControl: "private, no-store",
		});
		const request = new Request("https://example.com/api/resumes/jane/resume/pdf");

		const response = await handlePublicResumePdf(request, "jane", "resume");

		expect(response.headers.get("Cache-Control")).toBe("private, no-store");
		expect(mocks.createPublicResumePdf).toHaveBeenCalledWith(
			expect.objectContaining({ mismatchReason: "missing-projection" }),
		);
	});

	it.each([
		[{ code: "BAD_REQUEST" }, 400],
		[{ code: "NEED_PASSWORD" }, 401],
		[{ code: "NOT_FOUND" }, 404],
		[{ code: "RATE_LIMIT_EXCEEDED" }, 429],
		[{ code: "INTERNAL_SERVER_ERROR" }, 500],
	])("maps controlled API errors without caching the response", async (error, status) => {
		mocks.createPublicResumePdf.mockRejectedValueOnce(error);

		const response = await handlePublicResumePdf(
			new Request("https://example.com/api/resumes/jane/resume/pdf"),
			"jane",
			"resume",
		);

		expect(response.status).toBe(status);
		expect(response.headers.get("Cache-Control")).toBe("private, no-store");
	});

	it.each(["?reason=private-source", "?registryFingerprint=unsafe", "?adapterFingerprint=unsafe"])(
		"rejects invalid fallback metadata before the API service",
		async (search) => {
			const response = await handlePublicResumePdf(
				new Request(`https://example.com/api/resumes/jane/resume/pdf${search}`),
				"jane",
				"resume",
			);

			expect(response.status).toBe(400);
			expect(response.headers.get("Cache-Control")).toBe("private, no-store");
			expect(mocks.createPublicResumePdf).not.toHaveBeenCalled();
		},
	);
});
