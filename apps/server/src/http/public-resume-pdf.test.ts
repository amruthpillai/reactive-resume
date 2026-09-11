import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	createPublicResumePdf: vi.fn(),
}));

vi.mock("@reactive-resume/api/features/resume/public-pdf", () => ({
	createPublicResumePdf: mocks.createPublicResumePdf,
}));

const { handlePublicResumePdf } = await import("./public-resume-pdf");
const trustedClient = "203.0.113.9";

describe("handlePublicResumePdf", () => {
	beforeEach(() => vi.clearAllMocks());

	it("returns the authorized on-demand PDF without forwarding compatibility metadata", async () => {
		const body = new File(["%PDF"], "Ada_Lovelace.pdf", { type: "text/plain" });
		mocks.createPublicResumePdf.mockResolvedValueOnce({
			body,
			filename: "Ada_Lovelace.pdf",
		});
		const request = new Request("https://example.com/api/resumes/jane/resume/pdf?ignored=true", {
			headers: { "x-forwarded-for": "203.0.113.7" },
		});

		const response = await handlePublicResumePdf(request, "jane", "resume", trustedClient);

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/pdf");
		expect(response.headers.get("Content-Disposition")).toBe('inline; filename="Ada_Lovelace.pdf"');
		expect(response.headers.get("Cache-Control")).toBe("private, no-store");
		expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(await response.text()).toBe("%PDF");
		expect(mocks.createPublicResumePdf).toHaveBeenCalledWith({
			username: "jane",
			slug: "resume",
			requestHeaders: request.headers,
			trustedClient,
		});
	});

	it("keeps password and private responses uncacheable", async () => {
		mocks.createPublicResumePdf.mockResolvedValueOnce({
			body: new File(["%PDF"], "resume.pdf", { type: "application/pdf" }),
			filename: "resume.pdf",
		});
		const request = new Request("https://example.com/api/resumes/jane/resume/pdf");

		const response = await handlePublicResumePdf(request, "jane", "resume", trustedClient);

		expect(response.headers.get("Cache-Control")).toBe("private, no-store");
		expect(mocks.createPublicResumePdf).toHaveBeenCalledWith({
			username: "jane",
			slug: "resume",
			requestHeaders: request.headers,
			trustedClient,
		});
	});

	it.each([
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
			trustedClient,
		);

		expect(response.status).toBe(status);
		expect(response.headers.get("Cache-Control")).toBe("private, no-store");
	});
});
