/**
 * Creates a URL object with a url and label.
 * Returns empty strings if no URL is provided.
 */
export function createUrl(url?: string, label?: string): { url: string; label: string } {
	if (!url) return { url: "", label: "" };
	return { url, label: label || url };
}
