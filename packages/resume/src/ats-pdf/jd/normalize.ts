/**
 * Folds the cosmetic differences between a pasted job description and a PDF's extracted text:
 * compatibility characters, smart quotes, ligatures, and the several dashes that all mean "-".
 */
export function normalizeForMatching(value: string): string {
	return value
		.normalize("NFKC")
		.replaceAll("’", "'")
		.replaceAll("‘", "'")
		.replaceAll("“", '"')
		.replaceAll("”", '"')
		.replace(/[‐-―−]/g, "-")
		.replace(/[   ]/g, " ")
		.toLowerCase();
}
