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
	handleWebAppHead: vi.fn(),
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
	handleWebAppHead: mocks.handleWebAppHead,
}));

vi.mock("../mcp/handler", () => ({
	handleMcp: mocks.handleMcp,
}));

vi.mock("./resume-pdf", () => ({
	handleResumePdfDownload: mocks.handleResumePdfDownload,
}));

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
	mocks.handleWebAppHead.mockReturnValue(new Response(null));
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
		expect(mocks.handleWebAppHead).not.toHaveBeenCalled();
	});
});
