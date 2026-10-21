import type { ProviderRequest } from "./contracts";
import z from "zod";
import { countryName } from "@reactive-resume/utils/region";
import { MAX_PAGE_BYTES, WebAccessError } from "./contracts";
import { normalizeSearch, parseResponse, postJson } from "./transport";

/**
 * Tavily's accepted `country` values, which apply to the default "general" topic:
 * https://docs.tavily.com/documentation/api-reference/endpoint/search (country, checked 2026-10-21).
 */
const TAVILY_COUNTRIES: ReadonlySet<string> = new Set(
	"afghanistan,albania,algeria,andorra,angola,argentina,armenia,australia,austria,azerbaijan,bahamas,bahrain,bangladesh,barbados,belarus,belgium,belize,benin,bhutan,bolivia,bosnia and herzegovina,botswana,brazil,brunei,bulgaria,burkina faso,burundi,cambodia,cameroon,canada,cape verde,central african republic,chad,chile,china,colombia,comoros,congo,costa rica,croatia,cuba,cyprus,czech republic,denmark,djibouti,dominican republic,ecuador,egypt,el salvador,equatorial guinea,eritrea,estonia,ethiopia,fiji,finland,france,gabon,gambia,georgia,germany,ghana,greece,guatemala,guinea,haiti,honduras,hungary,iceland,india,indonesia,iran,iraq,ireland,israel,italy,jamaica,japan,jordan,kazakhstan,kenya,kuwait,kyrgyzstan,latvia,lebanon,lesotho,liberia,libya,liechtenstein,lithuania,luxembourg,madagascar,malawi,malaysia,maldives,mali,malta,mauritania,mauritius,mexico,moldova,monaco,mongolia,montenegro,morocco,mozambique,myanmar,namibia,nepal,netherlands,new zealand,nicaragua,niger,nigeria,north korea,north macedonia,norway,oman,pakistan,panama,papua new guinea,paraguay,peru,philippines,poland,portugal,qatar,romania,russia,rwanda,saudi arabia,senegal,serbia,singapore,slovakia,slovenia,somalia,south africa,south korea,south sudan,spain,sri lanka,sudan,sweden,switzerland,syria,taiwan,tajikistan,tanzania,thailand,togo,trinidad and tobago,tunisia,turkey,turkmenistan,uganda,ukraine,united arab emirates,united kingdom,united states,uruguay,uzbekistan,venezuela,vietnam,yemen,zambia,zimbabwe".split(
		",",
	),
);
/** Tavily's spelling where it differs from the English `Intl.DisplayNames` name. */
const TAVILY_NAMES: Record<string, string> = {
	BA: "bosnia and herzegovina",
	CG: "congo",
	CZ: "czech republic",
	MM: "myanmar",
	TR: "turkey",
	TT: "trinidad and tobago",
};
/** The `country` value for a code, or undefined when Tavily lists none, so the search runs unboosted. */
function tavilyCountry(code: string) {
	const name = TAVILY_NAMES[code] ?? countryName(code, "en").toLowerCase();
	return TAVILY_COUNTRIES.has(name) ? name : undefined;
}

const searchSchema = z.object({ results: z.array(z.unknown()).max(100) });
const itemSchema = z.object({
	url: z.string(),
	title: z.string(),
	content: z.string().optional(),
});
export async function searchTavily(query: string, { connection, signal, region }: ProviderRequest) {
	const country = region ? tavilyCountry(region) : undefined;
	const response = parseResponse(
		searchSchema,
		await postJson(
			"https://api.tavily.com/search",
			{
				authorization: `Bearer ${connection.apiKey ?? ""}`,
			},
			{
				query,
				max_results: 5,
				search_depth: "basic",
				include_answer: false,
				include_raw_content: false,
				...(country ? { country } : {}),
			},
			signal,
		),
	);
	return normalizeSearch(
		response.results.flatMap((value) => {
			const item = itemSchema.safeParse(value);
			return item.success
				? [
						{
							url: item.data.url,
							title: item.data.title,
							snippet: item.data.content,
						},
					]
				: [];
		}),
	);
}

const extractSchema = z.object({
	results: z
		.array(
			z.object({
				url: z.string(),
				raw_content: z.string().max(MAX_PAGE_BYTES),
			}),
		)
		.max(100),
	failed_results: z.array(z.object({ url: z.string(), error: z.string().optional() })).optional(),
});
export async function readTavily(url: string, { connection, signal }: ProviderRequest) {
	const response = parseResponse(
		extractSchema,
		await postJson(
			"https://api.tavily.com/extract",
			{
				authorization: `Bearer ${connection.apiKey ?? ""}`,
			},
			{
				urls: [url],
				format: "markdown",
				extract_depth: "advanced",
				include_images: false,
				timeout: 14,
				// Omit query/chunks_per_source: relevance reranking can silently omit posting paragraphs.
			},
			signal,
		),
	);
	// Exactly one URL was requested; a provider-normalized failure URL still belongs to this request.
	if (response.failed_results?.length) throw new WebAccessError("unreachable");
	const result = response.results[0];
	if (!result) throw new WebAccessError("empty");
	return {
		content: result.raw_content,
		format: "markdown" as const,
		resolvedUrl: result.url,
	};
}
