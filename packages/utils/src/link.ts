const SAFE_LINK_SCHEMES = new Set(["http:", "https:", "mailto:", "tel:"]);

/** Keeps only links an exported document can open safely; drops `javascript:`, `data:`, `file:` and relative URLs. */
export function toSafeLink(value: string): string | null {
	const input = value.trim();
	if (!input) return null;

	if (input.startsWith("mailto:")) {
		const email = input.slice("mailto:".length).trim();
		return email ? `mailto:${email}` : null;
	}

	try {
		const url = new URL(input);
		return SAFE_LINK_SCHEMES.has(url.protocol) ? url.toString() : null;
	} catch {
		return null;
	}
}
