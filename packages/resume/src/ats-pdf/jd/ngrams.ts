import { canonicalize, SKILL_SURFACE_FORMS } from "./aliases";
import { JD_STOPWORDS } from "./stopwords";

/** Windows this wide are scanned, but only a known skill form is kept at the longer lengths. */
export const MAX_NGRAM_LENGTH = 4;

/** Beyond two words, a phrase from a posting is too specific for any resume to match verbatim. */
const MAX_FREE_PHRASE_LENGTH = 2;

/**
 * The candidate terms in a run of text.
 *
 * Deliberately short. A posting's "hands-on Kubernetes and Terraform in production" is a sentence,
 * not a search term: no resume matches it, so reporting it as missing would be advice the reader
 * cannot act on. What survives is one- and two-word phrases with no filler in them, plus the
 * multi-word names the alias list already knows are single skills.
 */
export function buildNgrams(tokens: readonly string[], maxLength = MAX_NGRAM_LENGTH): string[] {
	const ngrams: string[] = [];

	for (let size = 1; size <= maxLength; size += 1) {
		for (let start = 0; start + size <= tokens.length; start += 1) {
			const window = tokens.slice(start, start + size);
			const phrase = window.join(" ");

			if (isKnownSkillForm(phrase)) {
				ngrams.push(phrase);
				continue;
			}

			if (size > MAX_FREE_PHRASE_LENGTH) continue;
			if (window.some(isNoise)) continue;

			ngrams.push(phrase);
		}
	}

	return ngrams;
}

/** A curated skill name keeps its filler: "profit and loss" is one term, not three. */
export function isKnownSkillForm(phrase: string): boolean {
	return SKILL_SURFACE_FORMS.has(phrase) || SKILL_SURFACE_FORMS.has(canonicalize(phrase));
}

function isNoise(token: string): boolean {
	// A lone number is noise; a number attached to a word ("soc2", "s3") is not.
	if (/^\d+([.,]\d+)?$/.test(token)) return true;
	if (token.length < 2) return true;
	return JD_STOPWORDS.has(token);
}
