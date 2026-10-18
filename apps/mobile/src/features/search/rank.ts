// Ranking for the search screen. Pure, so Node scripts can run it.

export type Searchable = {
	/** What the row shows first; matches here rank highest. */
	title: string;
	/** Secondary text and extra keywords; a match here ranks below any title match. */
	keywords?: readonly (string | null | undefined)[];
	/** Newer first among equal scores (ms since epoch). */
	time?: number;
};

const normalize = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();

const wordStart = (text: string, term: string) => text.split(/[^\p{L}\p{N}]+/u).some((word) => word.startsWith(term));

/** How well one field matches every term of the query: 3 prefix, 2 word start, 1 substring, 0 no match. */
function fieldScore(field: string, terms: readonly string[]) {
	const text = normalize(field);
	if (!text) return 0;
	let worst = 3;
	for (const term of terms) {
		const score = text.startsWith(term) ? 3 : wordStart(text, term) ? 2 : text.includes(term) ? 1 : 0;
		if (score === 0) return 0;
		worst = Math.min(worst, score);
	}
	return worst;
}

/** 0 when the item does not match. Title matches score 4–6, keyword matches 1–3. */
export function scoreItem(query: string, item: Searchable) {
	const terms = normalize(query).split(/\s+/).filter(Boolean);
	if (terms.length === 0) return 1;
	const title = fieldScore(item.title, terms);
	if (title > 0) return title + 3;
	// Terms may be split across the title and the keywords ("north unity").
	const all = [item.title, ...(item.keywords ?? [])].filter(Boolean).join(" ");
	return fieldScore(all, terms);
}

/** Matching items, best first, then newest, then by title. An empty query keeps every item, newest first. */
export function rank<T extends Searchable>(query: string, items: readonly T[]): T[] {
	return items
		.map((item) => ({ item, score: scoreItem(query, item) }))
		.filter(({ score }) => score > 0)
		.sort(
			(a, b) =>
				b.score - a.score || (b.item.time ?? 0) - (a.item.time ?? 0) || a.item.title.localeCompare(b.item.title),
		)
		.map(({ item }) => item);
}
