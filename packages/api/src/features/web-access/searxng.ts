import z from "zod";
import { getJson, normalizeSearch, parseResponse } from "./transport";

export type SearxngSearchOptions = {
	/** Operator-set instance address (`WEB_SEARCH_SEARXNG_URL`), without `/search`. */
	baseUrl: string;
	/** One ISO 3166-1 alpha-2 country, sent as the region part of SearXNG's `language`. */
	region?: string | undefined;
	/** The user's UI locale; its language part leads `language`, falling back to English. */
	locale?: string | undefined;
	signal: AbortSignal;
};

const searchSchema = z.object({ results: z.array(z.unknown()) });

/** `de-DE` and `pt_BR` give `de` and `pt`; anything unreadable gives `en`. */
function languageOf(locale: string | undefined) {
	return /^([a-z]{2,3})(?:[-_]|$)/i.exec(locale ?? "")?.[1]?.toLowerCase() ?? "en";
}

/**
 * Search API: https://docs.searxng.org/dev/search_api.html. The instance must list `json` in `search.formats`, or it
 * answers 403. `language=<lang>-<REGION>` localises results (measured 2026-10-21: `en-AU` gives SEEK and Jora, `en-SG`
 * gives JobStreet and LinkedIn SG; `de-AU` mixes SEEK and LinkedIn AU with German-language boards). When every engine
 * fails, SearXNG still answers 200 with no results.
 */
export async function searchSearxng(query: string, { baseUrl, region, locale, signal }: SearxngSearchOptions) {
	const url = new URL("search", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
	url.searchParams.set("q", query);
	url.searchParams.set("format", "json");
	if (region) url.searchParams.set("language", `${languageOf(locale)}-${region.toUpperCase()}`);
	const response = parseResponse(searchSchema, await getJson(url.toString(), {}, signal));
	return normalizeSearch(
		response.results.map((item) => {
			const { url, title, content } = (item ?? {}) as Record<string, unknown>;
			return { url, title, snippet: typeof content === "string" ? content : undefined };
		}),
	);
}
