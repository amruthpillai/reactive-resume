import z from "zod";
import { WebAccessError } from "./contracts";
import { getJson, normalizeSearch, parseResponse } from "./transport";

export type SearxngSearchOptions = {
	/** Operator-set instance address (`WEB_SEARCH_SEARXNG_URL`), without `/search`. */
	baseUrl: string;
	/** One ISO 3166-1 alpha-2 country, sent as the region part of SearXNG's `language`. */
	region?: string | undefined;
	signal: AbortSignal;
};

const searchSchema = z.object({
	results: z.array(z.unknown()),
	unresponsive_engines: z.array(z.unknown()).default([]),
});

/**
 * Search API: https://docs.searxng.org/dev/search_api.html. The instance must list `json` in `search.formats`, or it
 * answers 403. Use the country's likely language: invented pairs such as `en-JP` can resolve to the US in SearXNG.
 */
export async function searchSearxng(query: string, { baseUrl, region, signal }: SearxngSearchOptions) {
	const url = new URL("search", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
	url.searchParams.set("q", query);
	url.searchParams.set("format", "json");
	if (region) {
		const country = region.toUpperCase();
		const { language } = new Intl.Locale(`und-${country}`).maximize();
		url.searchParams.set("language", `${language}-${country}`);
	}
	const response = parseResponse(searchSchema, await getJson(url.toString(), {}, signal));
	if (response.results.length === 0 && response.unresponsive_engines.length > 0)
		throw new WebAccessError("unreachable");
	return normalizeSearch(
		response.results.map((item) => {
			const { url, title, content } = (item ?? {}) as Record<string, unknown>;
			return { url, title, snippet: typeof content === "string" ? content : undefined };
		}),
	);
}
