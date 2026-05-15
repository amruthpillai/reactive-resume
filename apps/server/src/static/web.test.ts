import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
	existsSync: vi.fn(() => true),
}));

vi.mock("node:fs/promises", () => ({
	default: {
		readFile: vi.fn(),
	},
}));

vi.mock("@hono/node-server/serve-static", () => ({
	serveStatic: vi.fn(() => vi.fn()),
}));

const { handleWebApp, handleWebAppHead } = await import("./web");

describe("web app fallback classification", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(fs.readFile).mockResolvedValue("<html>app</html>");
	});

	it("serves the shell for the root app route without noindex", async () => {
		const response = await handleWebApp(new Request("https://example.com/"));

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("text/html; charset=UTF-8");
		expect(response.headers.get("X-Robots-Tag")).toBeNull();
		expect(await response.text()).toBe("<html>app</html>");
	});

	it.each([
		"/auth/login",
		"/dashboard",
		"/builder/resume-1",
		"/agent",
		"/templates",
		"/templates/azurill.pdf",
	])("serves noindex shell for known app prefix %s", async (pathname) => {
		const response = await handleWebApp(new Request(`https://example.com${pathname}`));

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("text/html; charset=UTF-8");
		expect(response.headers.get("X-Robots-Tag")).toBe("noindex, follow");
		expect(await response.text()).toBe("<html>app</html>");
	});

	it("serves noindex shell for public resume shaped routes", async () => {
		const response = await handleWebApp(new Request("https://example.com/alice/resume"));

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Robots-Tag")).toBe("noindex, follow");
		expect(await response.text()).toBe("<html>app</html>");
	});

	it("returns noindex 404 for unknown non-asset routes", async () => {
		const response = await handleWebApp(new Request("https://example.com/unknown/extra/path"));

		expect(response.status).toBe(404);
		expect(response.headers.get("Content-Type")).toBe("text/plain; charset=UTF-8");
		expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
		expect(await response.text()).toBe("Not Found");
		expect(fs.readFile).not.toHaveBeenCalled();
	});

	it.each([
		"/api/foo",
		"/mcp/foo",
		"/uploads/foo",
	])("does not treat reserved two-segment path %s as a public resume", async (pathname) => {
		const response = await handleWebApp(new Request(`https://example.com${pathname}`));

		expect(response.status).toBe(404);
		expect(response.headers.get("Content-Type")).toBe("text/plain; charset=UTF-8");
		expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
		expect(await response.text()).toBe("Not Found");
		expect(fs.readFile).not.toHaveBeenCalled();
	});

	it("returns plain 404 for missing asset-looking paths", async () => {
		const response = await handleWebApp(new Request("https://example.com/assets/missing.css"));

		expect(response.status).toBe(404);
		expect(response.headers.get("X-Robots-Tag")).toBeNull();
		expect(await response.text()).toBe("Not Found");
		expect(fs.readFile).not.toHaveBeenCalled();
	});

	it("mirrors fallback status and headers for HEAD without a body", async () => {
		const knownResponse = handleWebAppHead(new Request("https://example.com/dashboard"));
		const unknownResponse = handleWebAppHead(new Request("https://example.com/unknown/extra/path"));

		expect(knownResponse.status).toBe(200);
		expect(knownResponse.headers.get("Content-Type")).toBe("text/html; charset=UTF-8");
		expect(knownResponse.headers.get("X-Robots-Tag")).toBe("noindex, follow");
		expect(await knownResponse.text()).toBe("");

		expect(unknownResponse.status).toBe(404);
		expect(unknownResponse.headers.get("Content-Type")).toBe("text/plain; charset=UTF-8");
		expect(unknownResponse.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
		expect(await unknownResponse.text()).toBe("");
	});
});
