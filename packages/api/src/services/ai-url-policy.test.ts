import { describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
	AI_PROVIDER_HOST_ALLOWLIST: "",
}));

vi.mock("@reactive-resume/env/server", () => ({ env: envMock }));

const { assertFetchablePublicHttpsUrl, resolveAiBaseUrl } = await import("./ai-url-policy");

describe("AI provider base URL policy", () => {
	it("allows public HTTPS provider URLs", () => {
		expect(resolveAiBaseUrl({ provider: "openai", baseURL: "https://api.openai.com/v1" })).toBe(
			"https://api.openai.com/v1",
		);
	});

	it("blocks private provider URLs unless the host is explicitly allowlisted", () => {
		expect(() => resolveAiBaseUrl({ provider: "openai-compatible", baseURL: "https://localhost:11434/v1" })).toThrow(
			"INVALID_AI_BASE_URL",
		);

		envMock.AI_PROVIDER_HOST_ALLOWLIST = "localhost,10.0.0.5";

		expect(resolveAiBaseUrl({ provider: "openai-compatible", baseURL: "https://localhost:11434/v1" })).toBe(
			"https://localhost:11434/v1",
		);
	});

	it("keeps URL-fetch tools public HTTPS only even when provider hosts are allowlisted", () => {
		envMock.AI_PROVIDER_HOST_ALLOWLIST = "localhost";

		expect(() => assertFetchablePublicHttpsUrl("https://localhost/internal-job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("http://example.com/job")).toThrow("URL_NOT_FETCHABLE");
		expect(assertFetchablePublicHttpsUrl("https://example.com/job")).toBe("https://example.com/job");
	});

	it("blocks special-use IP literals for URL-fetch tools", () => {
		expect(() => assertFetchablePublicHttpsUrl("https://100.64.0.1/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://192.0.2.1/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://192.88.99.1/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://198.18.0.1/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://198.51.100.1/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://203.0.113.1/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://224.0.0.1/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://[::]/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://[::ffff:8.8.8.8]/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://[::ffff:0808:0808]/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://[64:ff9b::1]/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://[100::1]/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://[100:0:0:1::1]/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://[2001::1]/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://[2001:100::1]/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://[2001:2::1]/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://[2001:10::1]/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://[ff02::1]/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://[2001:db8::1]/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://[3fff::1]/job")).toThrow("URL_NOT_FETCHABLE");
		expect(() => assertFetchablePublicHttpsUrl("https://[5f00::1]/job")).toThrow("URL_NOT_FETCHABLE");
	});
});
