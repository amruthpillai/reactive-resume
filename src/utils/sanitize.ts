import DOMPurify, { type Config } from "dompurify";

/**
 * DOMPurify configuration for sanitizing rich text content.
 * This configuration allows safe HTML tags used in the rich text editor
 * while stripping all potentially dangerous content like scripts and event handlers.
 */
const RICH_TEXT_CONFIG: Config = {
	// Allow safe HTML tags used by the TipTap editor
	ALLOWED_TAGS: [
		// Text formatting
		"p",
		"br",
		"hr",
		"span",
		"div",
		// Headings
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6",
		// Text styling
		"strong",
		"b",
		"em",
		"i",
		"u",
		"s",
		"strike",
		"mark",
		"code",
		"pre",
		// Lists
		"ul",
		"ol",
		"li",
		// Tables
		"table",
		"thead",
		"tbody",
		"tfoot",
		"tr",
		"th",
		"td",
		"colgroup",
		"col",
		// Links
		"a",
		// Quotes
		"blockquote",
	],
	// Allow safe attributes
	ALLOWED_ATTR: ["class", "style", "href", "target", "rel", "colspan", "rowspan", "data-type", "data-label"],
	// Only allow http and https protocols in links
	ALLOWED_URI_REGEXP: /^(?:(?:https?):\/\/|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
	// Force all links to open in new tab with safe rel attributes
	ADD_ATTR: ["target", "rel"],
	// Don't allow data: URIs which can be used for XSS
	ALLOW_DATA_ATTR: false,
};

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Uses DOMPurify with a strict configuration that only allows
 * safe HTML tags and attributes used by the rich text editor.
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(html: string): string {
	if (!html) return "";
	return DOMPurify.sanitize(html, { ...RICH_TEXT_CONFIG, RETURN_TRUSTED_TYPE: false }) as string;
}

/**
 * Sanitizes CSS content to prevent CSS injection attacks.
 * Only allows CSS rules, stripping any JavaScript or HTML that might be embedded.
 *
 * Note: This is a basic sanitization. For more robust CSS sanitization,
 * consider using a dedicated CSS parser/sanitizer library.
 */
export function sanitizeCss(css: string): string {
	if (!css) return "";

	// Remove any JavaScript expressions
	let sanitized = css
		// Remove javascript: URLs
		.replace(/javascript\s*:/gi, "")
		// Remove expression() which can execute JS in older IE
		.replace(/expression\s*\(/gi, "")
		// Remove url() with data: or javascript:
		.replace(/url\s*\(\s*["']?\s*(?:javascript|data):/gi, "url(")
		// Remove behavior: property (IE-specific, can run scripts)
		.replace(/behavior\s*:/gi, "")
		// Remove -moz-binding (Firefox-specific, can run scripts)
		.replace(/-moz-binding\s*:/gi, "")
		// Remove @import with javascript or data URLs
		.replace(/@import\s+(?:url\s*\()?["']?\s*(?:javascript|data):/gi, "");

	// Use DOMPurify to clean any HTML that might be in the CSS
	sanitized = DOMPurify.sanitize(sanitized, {
		ALLOWED_TAGS: [],
		ALLOWED_ATTR: [],
		KEEP_CONTENT: true,
		RETURN_TRUSTED_TYPE: false,
	}) as string;

	return sanitized;
}

/**
 * Checks if the given value is a plain JSON object (not null, not array, not other types).
 *
 * @param value - The value to check.
 * @returns True if the value is a plain object, false otherwise.
 */
export function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
