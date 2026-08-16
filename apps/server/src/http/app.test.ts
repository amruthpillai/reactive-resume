import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	handleAuth: vi.fn(),
	handleOAuth: vi.fn(),
	handleRpc: vi.fn(),
	handleOpenApi: vi.fn(),
	handleHealth: vi.fn(),
	handleUpload: vi.fn(),
	handleMcp: vi.fn(),
	handleResumePdfDownload: vi.fn(),
	handlePublicResumePdf: vi.fn(),
	handleMcpServerCard: vi.fn(),
	handleOAuthAuthorizationServer: vi.fn(),
	handleOAuthProtectedResource: vi.fn(),
	handleOpenIdConfiguration: vi.fn(),
	handleWellKnownFallback: vi.fn(),
	handleRobots: vi.fn(),
	handleSitemap: vi.fn(),
	handleLlms: vi.fn(),
	serveWebDistStatic: vi.fn(),
	handleWebApp: vi.fn(),
}));

vi.mock("./auth", () => ({
	handleAuth: mocks.handleAuth,
	handleOAuth: mocks.handleOAuth,
}));

vi.mock("./health", () => ({
	handleHealth: mocks.handleHealth,
}));

vi.mock("../rpc/handler", () => ({
	handleRpc: mocks.handleRpc,
}));

vi.mock("../openapi/handler", () => ({
	handleOpenApi: mocks.handleOpenApi,
}));

vi.mock("../openapi/metadata", () => ({
	handleMcpServerCard: mocks.handleMcpServerCard,
	handleOAuthAuthorizationServer: mocks.handleOAuthAuthorizationServer,
	handleOAuthProtectedResource: mocks.handleOAuthProtectedResource,
	handleOpenIdConfiguration: mocks.handleOpenIdConfiguration,
	handleWellKnownFallback: mocks.handleWellKnownFallback,
}));

vi.mock("../static/uploads", () => ({
	handleUpload: mocks.handleUpload,
}));

vi.mock("../static/seo", () => ({
	handleRobots: mocks.handleRobots,
	handleSitemap: mocks.handleSitemap,
	handleLlms: mocks.handleLlms,
}));

vi.mock("../static/web", () => ({
	serveWebDistStatic: mocks.serveWebDistStatic,
	handleWebApp: mocks.handleWebApp,
}));

vi.mock("../mcp/handler", () => ({
	handleMcp: mocks.handleMcp,
}));

vi.mock("./resume-pdf", () => ({
	handleResumePdfDownload: mocks.handleResumePdfDownload,
}));

vi.mock("./public-resume-pdf", () => ({
	handlePublicResumePdf: mocks.handlePublicResumePdf,
}));

const transportEnv = (remoteAddress: string) =>
	({
		incoming: { socket: { remoteAddress } },
	}) as never;

beforeEach(() => {
	vi.clearAllMocks();
	mocks.handleAuth.mockResolvedValue(new Response("auth"));
	mocks.handleOAuth.mockResolvedValue(new Response("oauth"));
	mocks.handleRpc.mockResolvedValue(new Response("rpc"));
	mocks.handleOpenApi.mockResolvedValue(new Response("openapi"));
	mocks.handleHealth.mockReturnValue(new Response("health"));
	mocks.handleUpload.mockResolvedValue(new Response("upload"));
	mocks.handleMcp.mockResolvedValue(new Response("mcp"));
	mocks.handleResumePdfDownload.mockResolvedValue(new Response("pdf"));
	mocks.handlePublicResumePdf.mockResolvedValue(new Response("public-pdf"));
	mocks.handleMcpServerCard.mockReturnValue(new Response("server-card"));
	mocks.handleOAuthAuthorizationServer.mockReturnValue(new Response("oauth-authorization-server"));
	mocks.handleOAuthProtectedResource.mockReturnValue(new Response("oauth-protected-resource"));
	mocks.handleOpenIdConfiguration.mockReturnValue(new Response("openid-configuration"));
	mocks.handleWellKnownFallback.mockReturnValue(new Response("well-known"));
	mocks.handleRobots.mockReturnValue(new Response("robots"));
	mocks.handleSitemap.mockReturnValue(new Response("sitemap"));
	mocks.handleLlms.mockReturnValue(new Response("llms"));
	mocks.serveWebDistStatic.mockResolvedValue(undefined);
	mocks.handleWebApp.mockResolvedValue(new Response("web"));
});

describe("createApp", () => {
	it("routes /api/auth/oauth to the OAuth bridge before the Better Auth wildcard", async () => {
		const { createApp } = await import("./app");
		const app = createApp();
		const request = new Request("http://localhost:3001/api/auth/oauth?client_id=test-client");

		const response = await app.fetch(request);

		await expect(response.text()).resolves.toBe("oauth");
		expect(mocks.handleOAuth).toHaveBeenCalledWith(request);
		expect(mocks.handleAuth).not.toHaveBeenCalled();
	});

	it("routes signed resume PDF downloads before the web fallback", async () => {
		const { createApp } = await import("./app");
		const app = createApp();
		const request = new Request("http://localhost:3001/api/resumes/resume-1/pdf?token=signed");

		const response = await app.fetch(request);

		await expect(response.text()).resolves.toBe("pdf");
		expect(mocks.handleResumePdfDownload).toHaveBeenCalledWith(request, "resume-1");
		expect(mocks.serveWebDistStatic).not.toHaveBeenCalled();
		expect(mocks.handleWebApp).not.toHaveBeenCalled();
	});

	it("uses the transport address for public PDF fallback despite rotated forwarding headers", async () => {
		const { createApp } = await import("./app");
		const app = createApp();
		const first = new Request("http://localhost:3001/api/resumes/jane/resume/pdf", {
			headers: { "x-forwarded-for": "198.51.100.1" },
		});
		const rotated = new Request("http://localhost:3001/api/resumes/jane/resume/pdf", {
			headers: { "x-forwarded-for": "198.51.100.2" },
		});
		const env = transportEnv("203.0.113.9");

		const response = await app.fetch(first, env);
		await app.fetch(rotated, env);

		await expect(response.text()).resolves.toBe("public-pdf");
		expect(mocks.handlePublicResumePdf).toHaveBeenNthCalledWith(1, first, "jane", "resume", "203.0.113.9");
		expect(mocks.handlePublicResumePdf).toHaveBeenNthCalledWith(2, rotated, "jane", "resume", "203.0.113.9");
		expect(mocks.handleResumePdfDownload).not.toHaveBeenCalled();
		expect(mocks.serveWebDistStatic).not.toHaveBeenCalled();
		expect(mocks.handleWebApp).not.toHaveBeenCalled();
	});

	it("passes the transport address to RPC and OpenAPI and fails closed when it is unavailable", async () => {
		const { createApp } = await import("./app");
		const app = createApp();
		const trustedRpcRequest = new Request("http://localhost:3001/api/rpc", {
			headers: { "cf-connecting-ip": "198.51.100.1" },
		});
		const unknownRpcRequest = new Request("http://localhost:3001/api/rpc", {
			headers: { "cf-connecting-ip": "198.51.100.2" },
		});
		const trustedOpenApiRequest = new Request("http://localhost:3001/api/openapi/resumes/jane/resume");
		const unknownOpenApiRequest = new Request("http://localhost:3001/api/openapi/resumes/jane/resume");

		await app.fetch(trustedRpcRequest, transportEnv("203.0.113.9"));
		await app.fetch(unknownRpcRequest);
		await app.fetch(trustedOpenApiRequest, transportEnv("203.0.113.9"));
		await app.fetch(unknownOpenApiRequest);

		expect(mocks.handleRpc).toHaveBeenNthCalledWith(1, trustedRpcRequest, "203.0.113.9");
		expect(mocks.handleRpc).toHaveBeenNthCalledWith(2, unknownRpcRequest, "unknown");
		expect(mocks.handleOpenApi).toHaveBeenNthCalledWith(1, trustedOpenApiRequest, "203.0.113.9");
		expect(mocks.handleOpenApi).toHaveBeenNthCalledWith(2, unknownOpenApiRequest, "unknown");
	});

	it.each([
		["GET", "/robots.txt", "robots", mocks.handleRobots],
		["HEAD", "/robots.txt", "", mocks.handleRobots],
		["GET", "/sitemap.xml", "sitemap", mocks.handleSitemap],
		["HEAD", "/sitemap.xml", "", mocks.handleSitemap],
		["GET", "/llms.txt", "llms", mocks.handleLlms],
		["HEAD", "/llms.txt", "", mocks.handleLlms],
	])("routes %s %s before the static fallback", async (method, pathname, expectedBody, handler) => {
		const { createApp } = await import("./app");
		const app = createApp();
		const request = new Request(`http://localhost:3001${pathname}`, { method });

		const response = await app.fetch(request);

		await expect(response.text()).resolves.toBe(expectedBody);
		expect(handler).toHaveBeenCalledWith({ head: method === "HEAD" });
		expect(mocks.serveWebDistStatic).not.toHaveBeenCalled();
		expect(mocks.handleWebApp).not.toHaveBeenCalled();
	});
});
