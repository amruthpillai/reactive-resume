import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
	CLOUDFLARE_ACCOUNT_ID: "",
	CLOUDFLARE_API_TOKEN: "",
	FLAG_ALLOW_UNSAFE_AI_BASE_URL: false,
}));

const dnsMock = vi.hoisted(() => ({
	lookup: vi.fn(),
}));

const undiciMock = vi.hoisted(() => {
	class MockAgent {
		static instances: MockAgent[] = [];

		close = vi.fn().mockResolvedValue(undefined);

		constructor(readonly options: Record<string, unknown>) {
			MockAgent.instances.push(this);
		}
	}

	return {
		Agent: MockAgent,
		fetch: vi.fn((input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init)),
	};
});

vi.mock("@reactive-resume/env/server", () => ({ env: envMock }));
vi.mock("node:dns/promises", () => dnsMock);
vi.mock("undici", () => ({
	Agent: undiciMock.Agent,
	fetch: undiciMock.fetch,
}));

const { fetchUrlForAgent } = await import("./agent-url");

function textResponse(body: string, options: { contentType: string; url?: string; status?: number }) {
	return new Response(body, {
		status: options.status ?? 200,
		headers: { "content-type": options.contentType },
	}) as Response & { url: string };
}

function responseWithUrl(body: string, options: { contentType: string; url?: string; status?: number }) {
	const response = textResponse(body, options);
	Object.defineProperty(response, "url", { value: options.url ?? "https://example.com/article" });
	return response;
}

describe("fetchUrlForAgent", () => {
	beforeEach(() => {
		envMock.CLOUDFLARE_ACCOUNT_ID = "";
		envMock.CLOUDFLARE_API_TOKEN = "";
		envMock.FLAG_ALLOW_UNSAFE_AI_BASE_URL = false;
		vi.restoreAllMocks();
		dnsMock.lookup.mockReset();
		dnsMock.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
		undiciMock.Agent.instances.length = 0;
		undiciMock.fetch.mockReset();
		undiciMock.fetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) =>
			globalThis.fetch(input, init),
		);
		vi.useRealTimers();
	});

	it("extracts local HTML article text with Readability and strips navigation/script/style noise", async () => {
		const articleText =
			"This is the actual article body with enough useful detail for the AI agent to summarize accurately. ".repeat(4);
		const fetchMock = vi.fn().mockResolvedValue(
			responseWithUrl(
				`
				<!doctype html>
				<html>
					<head>
						<title>Head title should lose to article title</title>
						<style>.secret { color: red; }</style>
					</head>
					<body>
						<nav>Home Pricing Login</nav>
						<script>window.__tracking = "do not include";</script>
						<article>
							<h1>Readable Article Title</h1>
							<p>${articleText}</p>
						</article>
						<footer>Privacy Terms</footer>
					</body>
				</html>
				`,
				{ contentType: "text/html; charset=utf-8", url: "https://example.com/final/article" },
			),
		);
		vi.stubGlobal("fetch", fetchMock);

		const result = await fetchUrlForAgent("https://example.com/article");

		expect(result).toEqual({
			url: "https://example.com/article",
			title: "Head title should lose to article title",
			content: expect.stringContaining("actual article body"),
			source: "local",
		});
		expect(result.content).toContain("Readable Article Title");
		expect(result.content).not.toContain("Home Pricing Login");
		expect(result.content).not.toContain("window.__tracking");
		expect(result.content).not.toContain("color: red");
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(
			"https://example.com/article",
			expect.objectContaining({
				redirect: "manual",
				signal: expect.any(AbortSignal),
			}),
		);
	});

	it("compacts local plain text and JSON responses", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(responseWithUrl("one\n\n two\tthree", { contentType: "text/plain" }))
			.mockResolvedValueOnce(
				responseWithUrl(JSON.stringify({ name: "Ada", role: "Engineer" }, null, 2), {
					contentType: "application/json",
				}),
			);
		vi.stubGlobal("fetch", fetchMock);

		await expect(fetchUrlForAgent("https://example.com/plain.txt")).resolves.toMatchObject({
			content: "one two three",
			source: "local",
			title: null,
		});
		await expect(fetchUrlForAgent("https://example.com/data.json")).resolves.toMatchObject({
			content: '{ "name": "Ada", "role": "Engineer" }',
			source: "local",
			title: null,
		});
	});

	it("falls back to Cloudflare when local content type is unsupported and credentials exist", async () => {
		vi.useFakeTimers();
		envMock.CLOUDFLARE_ACCOUNT_ID = "account-id";
		envMock.CLOUDFLARE_API_TOKEN = "api-token";
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(responseWithUrl("binary", { contentType: "application/pdf" }))
			.mockResolvedValueOnce(
				responseWithUrl(JSON.stringify({ success: true, result: "crawl-job-id" }), {
					contentType: "application/json",
					url: "https://api.cloudflare.com/client/v4/accounts/account-id/browser-rendering/crawl",
				}),
			)
			.mockResolvedValueOnce(
				responseWithUrl(JSON.stringify({ result: { status: "running", records: [] } }), {
					contentType: "application/json",
				}),
			)
			.mockResolvedValueOnce(
				responseWithUrl(
					JSON.stringify({
						result: { status: "completed", records: [{ markdown: "# Rendered\n\nCloudflare markdown" }] },
					}),
					{ contentType: "application/json" },
				),
			);
		vi.stubGlobal("fetch", fetchMock);

		const result = fetchUrlForAgent("https://example.com/file.pdf");
		await vi.advanceTimersByTimeAsync(0);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		await vi.advanceTimersByTimeAsync(500);

		await expect(result).resolves.toMatchObject({
			url: "https://example.com/file.pdf",
			content: "# Rendered Cloudflare markdown",
			source: "cloudflare",
		});
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			"https://api.cloudflare.com/client/v4/accounts/account-id/browser-rendering/crawl",
			expect.objectContaining({
				method: "POST",
				signal: expect.any(AbortSignal),
				body: JSON.stringify({
					url: "https://example.com/file.pdf",
					crawlPurposes: ["ai-input"],
					formats: ["markdown"],
					render: true,
					limit: 1,
					depth: 0,
				}),
			}),
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			3,
			"https://api.cloudflare.com/client/v4/accounts/account-id/browser-rendering/crawl/crawl-job-id?limit=1",
			expect.objectContaining({
				signal: expect.any(AbortSignal),
				headers: expect.objectContaining({
					authorization: "Bearer api-token",
				}),
			}),
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			4,
			"https://api.cloudflare.com/client/v4/accounts/account-id/browser-rendering/crawl/crawl-job-id?limit=1",
			expect.any(Object),
		);
	});

	it("submits the final validated redirect URL to Cloudflare when local extraction fails after redirects", async () => {
		envMock.CLOUDFLARE_ACCOUNT_ID = "account-id";
		envMock.CLOUDFLARE_API_TOKEN = "api-token";
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/file.pdf" } }))
			.mockResolvedValueOnce(
				responseWithUrl("binary", { contentType: "application/pdf", url: "https://example.com/file.pdf" }),
			)
			.mockResolvedValueOnce(
				responseWithUrl(JSON.stringify({ success: true, result: "redirect-job-id" }), {
					contentType: "application/json",
				}),
			)
			.mockResolvedValueOnce(
				responseWithUrl(
					JSON.stringify({ result: { status: "completed", records: [{ markdown: "redirect fallback" }] } }),
					{
						contentType: "application/json",
					},
				),
			);
		vi.stubGlobal("fetch", fetchMock);

		await expect(fetchUrlForAgent("https://example.com/start")).resolves.toMatchObject({
			url: "https://example.com/file.pdf",
			content: "redirect fallback",
			source: "cloudflare",
		});
		expect(fetchMock).toHaveBeenNthCalledWith(
			3,
			"https://api.cloudflare.com/client/v4/accounts/account-id/browser-rendering/crawl",
			expect.objectContaining({
				body: expect.stringContaining('"url":"https://example.com/file.pdf"'),
			}),
		);
	});

	it("blocks DNS resolutions to private addresses before local fetch or Cloudflare fallback", async () => {
		envMock.CLOUDFLARE_ACCOUNT_ID = "account-id";
		envMock.CLOUDFLARE_API_TOKEN = "api-token";
		dnsMock.lookup.mockResolvedValueOnce([{ address: "10.0.0.8", family: 4 }]);
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		await expect(fetchUrlForAgent("https://public.example.com/article")).rejects.toThrow("URL_NOT_FETCHABLE");
		expect(dnsMock.lookup).toHaveBeenCalledWith("public.example.com", { all: true });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("blocks DNS resolutions to special-use addresses before local fetch or Cloudflare fallback", async () => {
		envMock.CLOUDFLARE_ACCOUNT_ID = "account-id";
		envMock.CLOUDFLARE_API_TOKEN = "api-token";
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		for (const address of [
			"100.64.0.1",
			"192.0.2.1",
			"192.88.99.1",
			"198.18.0.1",
			"198.51.100.1",
			"203.0.113.1",
			"224.0.0.1",
			"255.255.255.255",
			"::",
			"::ffff:8.8.8.8",
			"::ffff:0808:0808",
			"64:ff9b::1",
			"100::1",
			"100:0:0:1::1",
			"2001::1",
			"2001:2::1",
			"2001:10::1",
			"2001:100::1",
			"ff02::1",
			"2001:db8::1",
			"3fff::1",
			"5f00::1",
		]) {
			dnsMock.lookup.mockResolvedValueOnce([{ address, family: address.includes(":") ? 6 : 4 }]);
			await expect(
				fetchUrlForAgent(`https://special-${address.replaceAll(":", "-")}.example.com/article`),
			).rejects.toThrow("URL_NOT_FETCHABLE");
		}

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("blocks IPv4-mapped IPv6 DNS resolutions to private addresses", async () => {
		envMock.CLOUDFLARE_ACCOUNT_ID = "account-id";
		envMock.CLOUDFLARE_API_TOKEN = "api-token";
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		for (const address of ["::ffff:10.0.0.1", "::ffff:127.0.0.1", "::ffff:169.254.169.254"]) {
			dnsMock.lookup.mockResolvedValueOnce([{ address, family: 6 }]);
			await expect(fetchUrlForAgent(`https://${address.replaceAll(":", "-")}.example.com/article`)).rejects.toThrow(
				"URL_NOT_FETCHABLE",
			);
		}

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("uses a pinned dispatcher lookup for the validated DNS address", async () => {
		dnsMock.lookup.mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }]);
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(responseWithUrl("Pinned DNS response", { contentType: "text/plain" }));
		vi.stubGlobal("fetch", fetchMock);

		await expect(fetchUrlForAgent("https://public.example.com/article")).resolves.toMatchObject({
			content: "Pinned DNS response",
			source: "local",
		});

		const [agent] = undiciMock.Agent.instances;
		const connect = agent?.options.connect as
			| {
					autoSelectFamily?: boolean;
					lookup?: (
						hostname: string,
						options: unknown,
						callback: (
							error: Error | null,
							address: string | Array<{ address: string; family: number }>,
							family?: number,
						) => void,
					) => void;
			  }
			| undefined;

		expect(connect?.autoSelectFamily).toBe(false);
		await expect(
			new Promise<{ address: string; family: number }>((resolve, reject) => {
				connect?.lookup?.("public.example.com", {}, (error, address, family) => {
					if (error) reject(error);
					else if (typeof address === "string" && family) resolve({ address, family });
					else reject(new Error("Expected single address lookup result"));
				});
			}),
		).resolves.toEqual({ address: "93.184.216.34", family: 4 });
		await expect(
			new Promise<Array<{ address: string; family: number }>>((resolve, reject) => {
				connect?.lookup?.("public.example.com", { all: true }, (error, addresses) => {
					if (error) reject(error);
					else if (Array.isArray(addresses)) resolve(addresses);
					else reject(new Error("Expected all-address lookup result"));
				});
			}),
		).resolves.toEqual([{ address: "93.184.216.34", family: 4 }]);
		expect(dnsMock.lookup).toHaveBeenCalledTimes(1);
	});

	it("times out DNS validation before local fetch or Cloudflare fallback", async () => {
		vi.useFakeTimers();
		envMock.CLOUDFLARE_ACCOUNT_ID = "account-id";
		envMock.CLOUDFLARE_API_TOKEN = "api-token";
		dnsMock.lookup.mockReturnValueOnce(new Promise(() => undefined));
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const result = fetchUrlForAgent("https://slow-dns.example.com/article");
		const rejection = expect(result).rejects.toThrow("URL_NOT_FETCHABLE");
		await vi.advanceTimersByTimeAsync(5_000);

		await rejection;
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("revalidates DNS for redirect targets before following them", async () => {
		envMock.CLOUDFLARE_ACCOUNT_ID = "account-id";
		envMock.CLOUDFLARE_API_TOKEN = "api-token";
		dnsMock.lookup
			.mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }])
			.mockResolvedValueOnce([{ address: "fd00::1", family: 6 }]);
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(null, { status: 302, headers: { location: "https://cdn.example.com/final" } }),
			);
		vi.stubGlobal("fetch", fetchMock);

		await expect(fetchUrlForAgent("https://example.com/start")).rejects.toThrow("URL_NOT_FETCHABLE");
		expect(dnsMock.lookup).toHaveBeenNthCalledWith(1, "example.com", { all: true });
		expect(dnsMock.lookup).toHaveBeenNthCalledWith(2, "cdn.example.com", { all: true });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("uses the latest validated redirect URL for Cloudflare fallback after network errors", async () => {
		envMock.CLOUDFLARE_ACCOUNT_ID = "account-id";
		envMock.CLOUDFLARE_API_TOKEN = "api-token";
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/final" } }))
			.mockRejectedValueOnce(new Error("connect timeout"))
			.mockResolvedValueOnce(
				responseWithUrl(JSON.stringify({ success: true, result: "network-job" }), { contentType: "application/json" }),
			)
			.mockResolvedValueOnce(
				responseWithUrl(
					JSON.stringify({ result: { status: "completed", records: [{ markdown: "network fallback" }] } }),
					{
						contentType: "application/json",
					},
				),
			);
		vi.stubGlobal("fetch", fetchMock);

		await expect(fetchUrlForAgent("https://example.com/start")).resolves.toMatchObject({
			url: "https://example.com/final",
			content: "network fallback",
			source: "cloudflare",
		});
		expect(fetchMock).toHaveBeenNthCalledWith(
			3,
			"https://api.cloudflare.com/client/v4/accounts/account-id/browser-rendering/crawl",
			expect.objectContaining({
				body: expect.stringContaining('"url":"https://example.com/final"'),
			}),
		);
	});

	it("cancels redirect, non-OK, unsupported, and oversized response bodies", async () => {
		envMock.CLOUDFLARE_ACCOUNT_ID = "account-id";
		envMock.CLOUDFLARE_API_TOKEN = "api-token";
		const redirectCancel = vi.fn();
		const nonOkCancel = vi.fn();
		const unsupportedCancel = vi.fn();
		const oversizedCancel = vi.fn();
		const oversizedBody = new ReadableStream({
			start(controller) {
				controller.enqueue(new Uint8Array(2 * 1024 * 1024 + 1));
			},
			cancel: oversizedCancel,
		});
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(new ReadableStream({ cancel: redirectCancel }), {
					status: 302,
					headers: { location: "https://example.com/redirected" },
				}),
			)
			.mockResolvedValueOnce(
				responseWithUrl("ok ".repeat(80), { contentType: "text/plain", url: "https://example.com/redirected" }),
			)
			.mockResolvedValueOnce(new Response(new ReadableStream({ cancel: nonOkCancel }), { status: 500 }))
			.mockResolvedValueOnce(
				responseWithUrl(JSON.stringify({ success: true, result: "non-ok-job" }), { contentType: "application/json" }),
			)
			.mockResolvedValueOnce(
				responseWithUrl(
					JSON.stringify({ result: { status: "completed", records: [{ markdown: "non-ok fallback" }] } }),
					{ contentType: "application/json" },
				),
			)
			.mockResolvedValueOnce(
				new Response(new ReadableStream({ cancel: unsupportedCancel }), {
					status: 200,
					headers: { "content-type": "application/pdf" },
				}),
			)
			.mockResolvedValueOnce(
				responseWithUrl(JSON.stringify({ success: true, result: "unsupported-job" }), {
					contentType: "application/json",
				}),
			)
			.mockResolvedValueOnce(
				responseWithUrl(
					JSON.stringify({ result: { status: "completed", records: [{ markdown: "unsupported fallback" }] } }),
					{ contentType: "application/json" },
				),
			)
			.mockResolvedValueOnce(new Response(oversizedBody, { status: 200, headers: { "content-type": "text/plain" } }))
			.mockResolvedValueOnce(
				responseWithUrl(JSON.stringify({ success: true, result: "oversized-job" }), {
					contentType: "application/json",
				}),
			)
			.mockResolvedValueOnce(
				responseWithUrl(
					JSON.stringify({ result: { status: "completed", records: [{ markdown: "oversized fallback" }] } }),
					{ contentType: "application/json" },
				),
			);
		vi.stubGlobal("fetch", fetchMock);

		await expect(fetchUrlForAgent("https://example.com/redirect")).resolves.toMatchObject({ source: "local" });
		await expect(fetchUrlForAgent("https://example.com/non-ok")).resolves.toMatchObject({ content: "non-ok fallback" });
		await expect(fetchUrlForAgent("https://example.com/unsupported")).resolves.toMatchObject({
			content: "unsupported fallback",
		});
		await expect(fetchUrlForAgent("https://example.com/oversized")).resolves.toMatchObject({
			content: "oversized fallback",
		});

		expect(redirectCancel).toHaveBeenCalled();
		expect(nonOkCancel).toHaveBeenCalled();
		expect(unsupportedCancel).toHaveBeenCalled();
		expect(oversizedCancel).toHaveBeenCalled();
	});

	it("cancels Cloudflare non-OK crawl creation and poll response bodies", async () => {
		envMock.CLOUDFLARE_ACCOUNT_ID = "account-id";
		envMock.CLOUDFLARE_API_TOKEN = "api-token";
		const createCancel = vi.fn();
		const pollCancel = vi.fn();
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(responseWithUrl("binary", { contentType: "application/pdf" }))
			.mockResolvedValueOnce(
				new Response(new ReadableStream({ cancel: createCancel }), {
					status: 500,
					headers: { "content-type": "application/json" },
				}),
			)
			.mockResolvedValueOnce(responseWithUrl("binary", { contentType: "application/pdf" }))
			.mockResolvedValueOnce(
				responseWithUrl(JSON.stringify({ success: true, result: "poll-job" }), { contentType: "application/json" }),
			)
			.mockResolvedValueOnce(
				new Response(new ReadableStream({ cancel: pollCancel }), {
					status: 503,
					headers: { "content-type": "application/json" },
				}),
			);
		vi.stubGlobal("fetch", fetchMock);

		await expect(fetchUrlForAgent("https://example.com/create-fails")).rejects.toThrow("URL_FETCH_FAILED");
		await expect(fetchUrlForAgent("https://example.com/poll-fails")).rejects.toThrow("URL_FETCH_FAILED");

		expect(createCancel).toHaveBeenCalled();
		expect(pollCancel).toHaveBeenCalled();
	});

	it("falls back to Cloudflare when local Readability content is too small and credentials exist", async () => {
		envMock.CLOUDFLARE_ACCOUNT_ID = "account-id";
		envMock.CLOUDFLARE_API_TOKEN = "api-token";
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				responseWithUrl("<html><head><title>Thin</title></head><body><article><p>Tiny.</p></article></body></html>", {
					contentType: "text/html",
				}),
			)
			.mockResolvedValueOnce(
				responseWithUrl(JSON.stringify({ success: true, result: "thin-job-id" }), {
					contentType: "application/json",
				}),
			)
			.mockResolvedValueOnce(
				responseWithUrl(
					JSON.stringify({
						result: { status: "completed", records: [{ markdown: "rendered fallback for thin page" }] },
					}),
					{
						contentType: "application/json",
					},
				),
			);
		vi.stubGlobal("fetch", fetchMock);

		await expect(fetchUrlForAgent("https://example.com/thin")).resolves.toMatchObject({
			content: "rendered fallback for thin page",
			source: "cloudflare",
		});
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("parses supported Cloudflare markdown payload shapes", async () => {
		envMock.CLOUDFLARE_ACCOUNT_ID = "account-id";
		envMock.CLOUDFLARE_API_TOKEN = "api-token";
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(responseWithUrl("nope", { contentType: "application/octet-stream" }))
			.mockResolvedValueOnce(
				responseWithUrl(JSON.stringify({ success: true, result: "records-job" }), { contentType: "application/json" }),
			)
			.mockResolvedValueOnce(
				responseWithUrl(JSON.stringify({ result: { status: "completed", records: [{ markdown: "records shape" }] } }), {
					contentType: "application/json",
				}),
			)
			.mockResolvedValueOnce(responseWithUrl("nope", { contentType: "application/octet-stream" }))
			.mockResolvedValueOnce(
				responseWithUrl(JSON.stringify({ success: true, result: "markdown-job" }), { contentType: "application/json" }),
			)
			.mockResolvedValueOnce(
				responseWithUrl(JSON.stringify({ result: { markdown: "first shape" } }), { contentType: "application/json" }),
			)
			.mockResolvedValueOnce(responseWithUrl("nope", { contentType: "application/octet-stream" }))
			.mockResolvedValueOnce(
				responseWithUrl(JSON.stringify({ success: true, result: "array-job" }), { contentType: "application/json" }),
			)
			.mockResolvedValueOnce(
				responseWithUrl(JSON.stringify({ result: [{ markdown: "array shape" }] }), { contentType: "application/json" }),
			);
		vi.stubGlobal("fetch", fetchMock);

		await expect(fetchUrlForAgent("https://example.com/records")).resolves.toMatchObject({ content: "records shape" });
		await expect(fetchUrlForAgent("https://example.com/markdown")).resolves.toMatchObject({ content: "first shape" });
		await expect(fetchUrlForAgent("https://example.com/array")).resolves.toMatchObject({ content: "array shape" });
	});

	it("blocks private and non-HTTPS URLs before Cloudflare fallback", async () => {
		envMock.CLOUDFLARE_ACCOUNT_ID = "account-id";
		envMock.CLOUDFLARE_API_TOKEN = "api-token";
		envMock.FLAG_ALLOW_UNSAFE_AI_BASE_URL = true;
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		await expect(fetchUrlForAgent("http://example.com/article")).rejects.toThrow("URL_NOT_FETCHABLE");
		await expect(fetchUrlForAgent("https://localhost/internal")).rejects.toThrow("URL_NOT_FETCHABLE");
		await expect(fetchUrlForAgent("https://10.0.0.5/internal")).rejects.toThrow("URL_NOT_FETCHABLE");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("blocks redirects to private and non-HTTPS URLs before following them or falling back to Cloudflare", async () => {
		envMock.CLOUDFLARE_ACCOUNT_ID = "account-id";
		envMock.CLOUDFLARE_API_TOKEN = "api-token";
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://localhost/internal" } }))
			.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "http://example.com/plain" } }));
		vi.stubGlobal("fetch", fetchMock);

		await expect(fetchUrlForAgent("https://example.com/private-redirect")).rejects.toThrow("URL_NOT_FETCHABLE");
		await expect(fetchUrlForAgent("https://example.com/http-redirect")).rejects.toThrow("URL_NOT_FETCHABLE");
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			"https://example.com/private-redirect",
			expect.objectContaining({ redirect: "manual" }),
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			"https://example.com/http-redirect",
			expect.objectContaining({ redirect: "manual" }),
		);
	});

	it("blocks redirects without Location before falling back to Cloudflare", async () => {
		envMock.CLOUDFLARE_ACCOUNT_ID = "account-id";
		envMock.CLOUDFLARE_API_TOKEN = "api-token";
		const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 302 }));
		vi.stubGlobal("fetch", fetchMock);

		await expect(fetchUrlForAgent("https://example.com/missing-location")).rejects.toThrow("URL_NOT_FETCHABLE");
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(
			"https://example.com/missing-location",
			expect.objectContaining({ redirect: "manual" }),
		);
	});

	it("resolves relative HTTPS redirects and uses the final URL for local Readability extraction", async () => {
		const articleText =
			"This redirected article has enough readable content for extraction after following a relative Location header. ".repeat(
				4,
			);
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/final/article" } }))
			.mockResolvedValueOnce(
				responseWithUrl(
					`<html><head><title>Redirected</title></head><body><article><h1>Redirected</h1><p>${articleText}</p></article></body></html>`,
					{ contentType: "text/html", url: "https://example.com/final/article" },
				),
			);
		vi.stubGlobal("fetch", fetchMock);

		await expect(fetchUrlForAgent("https://example.com/start")).resolves.toMatchObject({
			url: "https://example.com/final/article",
			content: expect.stringContaining("redirected article"),
			source: "local",
		});
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			"https://example.com/final/article",
			expect.objectContaining({ redirect: "manual" }),
		);
	});

	it("falls back to Cloudflare when the local response exceeds the byte limit", async () => {
		envMock.CLOUDFLARE_ACCOUNT_ID = "account-id";
		envMock.CLOUDFLARE_API_TOKEN = "api-token";
		const oversized = "a".repeat(2 * 1024 * 1024 + 1);
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(responseWithUrl(oversized, { contentType: "text/plain" }))
			.mockResolvedValueOnce(
				responseWithUrl(JSON.stringify({ success: true, result: "huge-job-id" }), { contentType: "application/json" }),
			)
			.mockResolvedValueOnce(
				responseWithUrl(
					JSON.stringify({
						result: { status: "completed", records: [{ markdown: "fallback after oversized response" }] },
					}),
					{
						contentType: "application/json",
					},
				),
			);
		vi.stubGlobal("fetch", fetchMock);

		await expect(fetchUrlForAgent("https://example.com/huge.txt")).resolves.toMatchObject({
			content: "fallback after oversized response",
			source: "cloudflare",
		});
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});
});
