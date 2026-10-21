import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const fixtures = vi.hoisted(() => ({
	env: {} as { WEB_SEARCH_SEARXNG_URL?: string; WEB_ACCESS_PROVIDER?: "tavily"; WEB_ACCESS_API_KEY?: string },
}));
vi.mock("@reactive-resume/env/server", () => ({ env: fixtures.env }));
// Without ENCRYPTION_SECRET no saved credential is read, so status never queries the database.
vi.mock("@reactive-resume/db/client", () => ({ db: {} }));

const { webAccessService } = await import("./credentials");

describe("web access status", () => {
	beforeEach(() => {
		for (const key of Object.keys(fixtures.env)) delete fixtures.env[key as keyof typeof fixtures.env];
	});

	it("says search goes to the server's SearXNG when no connection is configured", async () => {
		fixtures.env.WEB_SEARCH_SEARXNG_URL = "http://searxng:8080";
		expect(await webAccessService.status("alice")).toMatchObject({
			configured: false,
			provider: null,
			search: true,
			searxng: true,
		});
	});

	it("says search goes to SearXNG beside a shared web connection", async () => {
		fixtures.env.WEB_SEARCH_SEARXNG_URL = "http://searxng:8080";
		fixtures.env.WEB_ACCESS_PROVIDER = "tavily";
		expect(await webAccessService.status("alice")).toMatchObject({
			managed: true,
			provider: "tavily",
			search: true,
			searxng: true,
		});
	});

	it("reports no SearXNG and no search without either", async () => {
		expect(await webAccessService.status("alice")).toMatchObject({ search: false, searxng: false });
	});
});
