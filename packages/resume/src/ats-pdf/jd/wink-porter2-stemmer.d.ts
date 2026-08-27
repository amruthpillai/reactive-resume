declare module "wink-porter2-stemmer" {
	/** Porter Stemmer V2. Expects a single lowercase word and returns its stem. */
	function stem(word: string): string;

	export default stem;
}
