/**
 * Converts a summary string and optional highlights array into an HTML description.
 * Summary becomes a <p> tag, highlights become a <ul> list.
 */
export function toHtmlDescription(summary?: string, highlights?: string[]): string {
	const parts: string[] = [];

	if (summary) {
		parts.push(`<p>${summary}</p>`);
	}

	if (highlights && highlights.length > 0) {
		parts.push("<ul>");

		for (const highlight of highlights) {
			parts.push(`<li>${highlight}</li>`);
		}

		parts.push("</ul>");
	}

	return parts.join("");
}

/**
 * Converts an array of strings into an HTML unordered list.
 */
export function arrayToHtmlList(items: string[]): string {
	if (items.length === 0) return "";
	return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}
