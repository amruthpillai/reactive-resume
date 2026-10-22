import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { searchSearxng } from "./searxng";

const BASE = "http://searxng:8080";
const calls: { url: URL; init: RequestInit | undefined }[] = [];
let reply: () => Response;

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const search = (options: { region?: string; baseUrl?: string } = {}) =>
	searchSearxng("designer jobs", { baseUrl: BASE, signal: AbortSignal.timeout(5_000), ...options });

beforeEach(() => {
	calls.length = 0;
	reply = () => json({ results: [] });
	vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
		calls.push({ url: new URL(input instanceof Request ? input.url : input.toString()), init });
		return reply();
	});
});
afterEach(() => {
	vi.unstubAllGlobals();
});

describe("SearXNG search request", () => {
	it("asks the instance's JSON search API with no language when there is no region", async () => {
		await search();
		expect(calls).toHaveLength(1);
		expect(calls[0]?.url.toString()).toBe(`${BASE}/search?q=designer+jobs&format=json`);
		expect(calls[0]?.init).toMatchObject({ method: "GET", redirect: "error" });
		expect(calls[0]?.init?.body).toBeUndefined();
	});

	it("keeps a base URL's path prefix", async () => {
		await search({ baseUrl: "https://search.example.com/searxng/" });
		expect(calls[0]?.url.toString()).toBe("https://search.example.com/searxng/search?q=designer+jobs&format=json");
	});

	it.each([
		["AU", "en-AU"],
		["SG", "en-SG"],
		["JP", "ja-JP"],
		["BR", "pt-BR"],
		["DE", "de-DE"],
		["FR", "fr-FR"],
	])("uses a real regional locale for %s: %s", async (region, language) => {
		await search({ region });
		expect(calls[0]?.url.searchParams.get("language")).toBe(language);
		expect(calls[0]?.url.searchParams.get("q")).toBe("designer jobs");
		expect(calls[0]?.url.searchParams.get("format")).toBe("json");
	});
});

describe("SearXNG search response", () => {
	it("maps url, title and content to url, title and snippet, filtering unsafe links and capping at five", async () => {
		reply = () =>
			json({
				query: "designer jobs",
				number_of_results: 0,
				results: [
					{ url: "https://jobs.example.com/1", title: "One", content: "Sydney", engine: "bing", score: 3 },
					{ url: "https://jobs.example.com/2", title: "Two", content: "" },
					{ url: "https://jobs.example.com/3", title: "Three", content: null },
					{ url: "https://localhost/private", title: "Private", content: "x" },
					{ url: "https://jobs.example.com/missing-title", content: "x" },
					...[4, 5, 6, 7].map((n) => ({ url: `https://jobs.example.com/${n}`, title: `${n}` })),
				],
				unresponsive_engines: [],
			});
		expect(await search()).toEqual([
			{ url: "https://jobs.example.com/1", title: "One", snippet: "Sydney" },
			{ url: "https://jobs.example.com/2", title: "Two" },
			{ url: "https://jobs.example.com/3", title: "Three" },
			{ url: "https://jobs.example.com/4", title: "4" },
			{ url: "https://jobs.example.com/5", title: "5" },
		]);
	});

	it("reports an empty result with engine failures as unavailable", async () => {
		reply = () =>
			json({
				query: "designer jobs",
				results: [],
				unresponsive_engines: [
					["google", "timeout"],
					["bing", "CAPTCHA"],
				],
			});
		await expect(search({ region: "SG" })).rejects.toMatchObject({ reason: "unreachable" });
	});

	it("keeps useful results when another engine failed, and accepts a clean empty search", async () => {
		reply = () =>
			json({
				results: [{ url: "https://jobs.example.com/1", title: "One" }],
				unresponsive_engines: [["bing", "timeout"]],
			});
		expect(await search()).toEqual([{ url: "https://jobs.example.com/1", title: "One" }]);
		reply = () => json({ results: [], unresponsive_engines: [] });
		expect(await search()).toEqual([]);
	});

	it.each([500, 502, 404])("reports HTTP %i as unreachable", async (status) => {
		reply = () => json({ error: "down" }, status);
		await expect(search()).rejects.toMatchObject({ reason: "unreachable" });
	});

	it("reports a disabled JSON format (HTTP 403) as an access failure", async () => {
		reply = () => new Response("Forbidden", { status: 403 });
		await expect(search()).rejects.toMatchObject({ reason: "auth" });
	});

	it("rejects a response without a results list as malformed", async () => {
		reply = () => json({ answers: [] });
		await expect(search()).rejects.toMatchObject({ reason: "malformed" });
	});
});
