import { describe, expect, it, vi } from "vitest";

vi.mock("@reactive-resume/env/server", () => ({
	env: {
		APP_URL: "https://app.example.com/",
	},
}));

const { handleLlms, handleRobots, handleSitemap } = await import("./seo");

describe("SEO static endpoints", () => {
	it("generates robots.txt from the normalized app URL", async () => {
		const response = handleRobots();
		const text = await response.text();

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("text/plain; charset=UTF-8");
		expect(text).toContain("User-agent: *");
		expect(text).toContain("Allow: /");
		expect(text).toContain("Disallow: /api/rpc");
		expect(text).toContain("Disallow: /api/auth");
		expect(text).toContain("Disallow: /mcp");
		expect(text).toContain("Disallow: /.well-known");
		expect(text).toContain("Sitemap: https://app.example.com/sitemap.xml");
		expect(text).toContain("Sitemap: https://docs.rxresu.me/sitemap.xml");
		expect(text).not.toMatch(/GPTBot|ClaudeBot|PerplexityBot|CCBot|ChatGPT-User/);
	});

	it("generates an app-domain-only sitemap", async () => {
		const response = handleSitemap();
		const text = await response.text();

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/xml; charset=UTF-8");
		expect(text).toContain("<loc>https://app.example.com/</loc>");
		expect(text).not.toContain("docs.rxresu.me");
		expect(text).not.toContain("/auth");
		expect(text).not.toContain("/dashboard");
		expect(text).not.toContain("/builder");
		expect(text).not.toContain("/templates");
		expect(text).not.toContain("/schema.json");
	});

	it("generates a lightweight llms.txt product index", async () => {
		const response = handleLlms();
		const text = await response.text();

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("text/plain; charset=UTF-8");
		expect(text).toContain("# Reactive Resume");
		expect(text).toContain("- Product: https://app.example.com");
		expect(text).toContain("- Documentation: https://docs.rxresu.me");
		expect(text).toContain("- Documentation sitemap: https://docs.rxresu.me/sitemap.xml");
		expect(text).toContain("- Documentation llms.txt: https://docs.rxresu.me/llms.txt");
		expect(text).toContain("- API documentation: https://docs.rxresu.me/api-reference");
		expect(text).toContain("- Resume schema: https://app.example.com/schema.json");
		expect(text).toContain("- MCP documentation: https://docs.rxresu.me/guides/using-the-mcp-server");
		expect(text).toContain("- OpenAPI specification: https://app.example.com/api/openapi/spec.json");
	});

	it("returns headers without a body for HEAD responses", async () => {
		const response = handleLlms({ head: true });

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("text/plain; charset=UTF-8");
		expect(await response.text()).toBe("");
	});
});
