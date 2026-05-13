import { lookup } from "node:dns/promises";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { Agent, fetch as undiciFetch } from "undici";
import { env } from "@reactive-resume/env/server";
import { isPrivateOrLoopbackHost } from "@reactive-resume/utils/url-security.node";
import { assertFetchablePublicHttpsUrl } from "./ai-url-policy";

const MAX_FETCHED_TEXT_CHARS = 40_000;
const MAX_LOCAL_FETCH_BYTES = 2 * 1024 * 1024;
const MAX_LOCAL_REDIRECTS = 5;
const MAX_CLOUDFLARE_CRAWL_POLLS = 6;
const CLOUDFLARE_CRAWL_POLL_DELAY_MS = 500;
const LOCAL_FETCH_TIMEOUT_MS = 10_000;
const DNS_LOOKUP_TIMEOUT_MS = 5_000;
const CLOUDFLARE_CRAWL_CREATE_TIMEOUT_MS = 15_000;
const CLOUDFLARE_CRAWL_POLL_TIMEOUT_MS = 10_000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

type FetchedUrlResult = {
	url: string;
	title: string | null;
	content: string;
	source: "local" | "cloudflare";
};

type FetchResponse = Awaited<ReturnType<typeof undiciFetch>>;
type ResolvedAddress = { address: string; family: number };

class LocalFetchError extends Error {
	constructor(
		message: string,
		readonly fallbackUrl: string,
	) {
		super(message);
	}
}

function compactText(value: string) {
	return value.replace(/\s+/g, " ").trim().slice(0, MAX_FETCHED_TEXT_CHARS);
}

function extractReadableHtml(html: string, url: string) {
	const dom = new JSDOM(html, { url });

	try {
		const article = new Readability(dom.window.document).parse();
		const content = compactText(article?.textContent ?? "");

		if (content.length < 160) throw new Error("URL_READABILITY_FAILED");

		return {
			title: article?.title ? compactText(article.title) : null,
			content,
		};
	} finally {
		dom.window.close();
	}
}

async function readLimitedText(response: FetchResponse) {
	const reader = response.body?.getReader();
	if (!reader) return response.text();

	const chunks: Uint8Array[] = [];
	let size = 0;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (!value) continue;

		size += value.byteLength;
		if (size > MAX_LOCAL_FETCH_BYTES) {
			await reader.cancel("FETCHED_URL_TOO_LARGE");
			throw new Error("FETCHED_URL_TOO_LARGE");
		}
		chunks.push(value);
	}

	return new TextDecoder().decode(Buffer.concat(chunks));
}

function timeoutSignal(ms: number) {
	if (typeof AbortSignal.timeout === "function") return AbortSignal.timeout(ms);

	const controller = new AbortController();
	setTimeout(() => controller.abort(), ms);
	return controller.signal;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, errorCode: string) {
	let timeout: NodeJS.Timeout | undefined;

	try {
		return await Promise.race([
			promise,
			new Promise<never>((_, reject) => {
				timeout = setTimeout(() => reject(new Error(errorCode)), ms);
			}),
		]);
	} finally {
		if (timeout) clearTimeout(timeout);
	}
}

async function cancelResponseBody(response: FetchResponse) {
	try {
		await response.body?.cancel();
	} catch {
		// Best effort cleanup only; the original fetch/extraction error should stay authoritative.
	}
}

function isRedirectResponse(response: { status: number }) {
	return REDIRECT_STATUSES.has(response.status);
}

function resolveRedirectUrl(location: string, currentUrl: string) {
	try {
		return new URL(location, currentUrl).toString();
	} catch {
		throw new Error("URL_NOT_FETCHABLE");
	}
}

async function assertResolvesToPublicAddress(url: string) {
	const { hostname } = new URL(url);

	let addresses: ResolvedAddress[];
	try {
		addresses = await withTimeout(lookup(hostname, { all: true }), DNS_LOOKUP_TIMEOUT_MS, "URL_NOT_FETCHABLE");
	} catch {
		throw new Error("URL_NOT_FETCHABLE");
	}

	if (addresses.length === 0) throw new Error("URL_NOT_FETCHABLE");
	if (addresses.some(({ address }) => isPrivateOrLoopbackHost(address))) throw new Error("URL_NOT_FETCHABLE");

	const [address] = addresses;
	if (!address) throw new Error("URL_NOT_FETCHABLE");

	return address;
}

function createPinnedDispatcher(url: string, address: string, family: number) {
	const { hostname } = new URL(url);

	return new Agent({
		connect: {
			autoSelectFamily: false,
			servername: hostname,
			lookup: (_hostname, options, callback) => {
				if (typeof options === "object" && options && "all" in options && options.all) {
					callback(null, [{ address, family }]);
					return;
				}

				callback(null, address, family);
			},
		},
	});
}

async function fetchLocalResponse(inputUrl: string) {
	let url = assertFetchablePublicHttpsUrl(inputUrl);

	for (let redirectCount = 0; redirectCount <= MAX_LOCAL_REDIRECTS; redirectCount++) {
		const address = await assertResolvesToPublicAddress(url);
		const dispatcher = createPinnedDispatcher(url, address.address, address.family);
		let response: FetchResponse;

		try {
			response = await undiciFetch(url, {
				dispatcher,
				redirect: "manual",
				signal: timeoutSignal(LOCAL_FETCH_TIMEOUT_MS),
				headers: {
					accept: "text/html, text/plain;q=0.9, application/json;q=0.8",
					"user-agent": "ReactiveResumeAI/1.0",
				},
			});
		} catch (error) {
			await dispatcher.close();
			if (error instanceof Error && error.message === "URL_NOT_FETCHABLE") throw error;
			throw new LocalFetchError("URL_FETCH_FAILED", url);
		}

		if (!isRedirectResponse(response)) return { response, url, dispatcher };

		const location = response.headers.get("location");
		await cancelResponseBody(response);
		await dispatcher.close();
		if (!location) throw new Error("URL_NOT_FETCHABLE");
		if (redirectCount === MAX_LOCAL_REDIRECTS) throw new Error("URL_NOT_FETCHABLE");

		url = assertFetchablePublicHttpsUrl(resolveRedirectUrl(location, url));
	}

	throw new Error("URL_NOT_FETCHABLE");
}

async function fetchLocally(url: string): Promise<FetchedUrlResult> {
	const { response, url: responseUrl, dispatcher } = await fetchLocalResponse(url);

	try {
		if (!response.ok) {
			await cancelResponseBody(response);
			throw new LocalFetchError("URL_FETCH_FAILED", responseUrl);
		}

		const contentType = response.headers.get("content-type") ?? "";
		if (
			!contentType.includes("text/html") &&
			!contentType.includes("text/plain") &&
			!contentType.includes("application/json")
		) {
			await cancelResponseBody(response);
			throw new LocalFetchError("URL_FETCH_UNSUPPORTED_CONTENT_TYPE", responseUrl);
		}

		const raw = await readLimitedText(response);
		const isHtml = contentType.includes("text/html");
		const extracted = isHtml ? extractReadableHtml(raw, responseUrl) : { title: null, content: compactText(raw) };

		return {
			url: responseUrl,
			title: extracted.title,
			content: extracted.content,
			source: "local",
		};
	} catch (error) {
		if (error instanceof LocalFetchError) throw error;
		if (error instanceof Error) throw new LocalFetchError(error.message, responseUrl);
		throw new LocalFetchError("URL_READABILITY_FAILED", responseUrl);
	} finally {
		await dispatcher.close();
	}
}

function extractCloudflareMarkdown(payload: unknown): string | null {
	if (!payload || typeof payload !== "object") return null;
	const record = payload as Record<string, unknown>;
	const result = record.result;

	if (result && typeof result === "object") {
		const resultRecord = result as Record<string, unknown>;
		if (Array.isArray(resultRecord.records)) {
			const [first] = resultRecord.records;
			const markdown = first && typeof first === "object" ? (first as Record<string, unknown>).markdown : null;
			if (typeof markdown === "string") return markdown;
		}
		if (typeof resultRecord.markdown === "string") return resultRecord.markdown;
		if (Array.isArray(resultRecord.pages)) {
			const [first] = resultRecord.pages;
			const markdown = first && typeof first === "object" ? (first as Record<string, unknown>).markdown : null;
			if (typeof markdown === "string") return markdown;
		}
	}
	if (Array.isArray(result)) {
		const [first] = result;
		const markdown = first && typeof first === "object" ? (first as Record<string, unknown>).markdown : null;
		if (typeof markdown === "string") return markdown;
	}

	return null;
}

function extractCloudflareJobId(payload: unknown): string | null {
	if (!payload || typeof payload !== "object") return null;
	const result = (payload as Record<string, unknown>).result;

	return typeof result === "string" && result.trim() ? result : null;
}

function extractCloudflareCrawlStatus(payload: unknown): string | null {
	if (!payload || typeof payload !== "object") return null;
	const result = (payload as Record<string, unknown>).result;
	if (!result || typeof result !== "object") return null;
	const status = (result as Record<string, unknown>).status;

	return typeof status === "string" ? status.toLowerCase() : null;
}

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithCloudflare(url: string): Promise<FetchedUrlResult> {
	if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) throw new Error("URL_READABILITY_FAILED");

	const crawlUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/crawl`;
	const headers = {
		authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
	};

	const response = await undiciFetch(crawlUrl, {
		method: "POST",
		signal: timeoutSignal(CLOUDFLARE_CRAWL_CREATE_TIMEOUT_MS),
		headers: {
			...headers,
			"content-type": "application/json",
		},
		body: JSON.stringify({
			url,
			crawlPurposes: ["ai-input"],
			formats: ["markdown"],
			render: true,
			limit: 1,
			depth: 0,
		}),
	});

	if (!response.ok) {
		await cancelResponseBody(response);
		throw new Error("URL_FETCH_FAILED");
	}

	const jobId = extractCloudflareJobId(await response.json());
	if (!jobId) throw new Error("URL_READABILITY_FAILED");

	let markdown: string | null = null;
	for (let attempt = 0; attempt < MAX_CLOUDFLARE_CRAWL_POLLS; attempt++) {
		const resultResponse = await undiciFetch(`${crawlUrl}/${encodeURIComponent(jobId)}?limit=1`, {
			headers,
			signal: timeoutSignal(CLOUDFLARE_CRAWL_POLL_TIMEOUT_MS),
		});
		if (!resultResponse.ok) {
			await cancelResponseBody(resultResponse);
			throw new Error("URL_FETCH_FAILED");
		}

		const payload = await resultResponse.json();
		markdown = extractCloudflareMarkdown(payload);
		if (markdown) break;

		const status = extractCloudflareCrawlStatus(payload);
		if (status !== "running" && status !== "queued") break;
		if (attempt < MAX_CLOUDFLARE_CRAWL_POLLS - 1) await wait(CLOUDFLARE_CRAWL_POLL_DELAY_MS);
	}

	if (!markdown) throw new Error("URL_READABILITY_FAILED");

	return {
		url,
		title: null,
		content: compactText(markdown),
		source: "cloudflare",
	};
}

export async function fetchUrlForAgent(input: string): Promise<FetchedUrlResult> {
	const url = assertFetchablePublicHttpsUrl(input);

	try {
		return await fetchLocally(url);
	} catch (error) {
		if (error instanceof Error && error.message === "URL_NOT_FETCHABLE") throw error;
		return fetchWithCloudflare(error instanceof LocalFetchError ? error.fallbackUrl : url);
	}
}
