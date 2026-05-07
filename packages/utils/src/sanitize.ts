import DOMPurify, { type Config } from "dompurify";

const RICH_TEXT_CONFIG: Config = {
	ALLOWED_TAGS: [
		"p",
		"br",
		"hr",
		"span",
		"div",
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6",
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
		"ul",
		"ol",
		"li",
		"table",
		"thead",
		"tbody",
		"tfoot",
		"tr",
		"th",
		"td",
		"colgroup",
		"col",
		"a",
		"blockquote",
	],
	ALLOWED_ATTR: ["class", "style", "href", "target", "rel", "colspan", "rowspan", "data-type", "data-label"],
	ALLOWED_URI_REGEXP: /^(?:(?:https?):\/\/|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
	ADD_ATTR: ["target", "rel"],
	ALLOW_DATA_ATTR: false,
};

const PLAIN_TEXT_SANITIZE_CONFIG: Config = {
	ALLOWED_TAGS: [],
	ALLOWED_ATTR: [],
	KEEP_CONTENT: true,
	RETURN_TRUSTED_TYPE: false,
};

function sanitizePlainTextContent(value: string): string {
	return DOMPurify.sanitize(value, PLAIN_TEXT_SANITIZE_CONFIG) as string;
}

function stripCssComments(value: string): string {
	if (!value) return "";
	return value.replace(/\/\*[\s\S]*?\*\//g, "");
}

function decodeCssEscapes(value: string): string {
	if (!value) return "";

	return value.replace(/\\([0-9a-fA-F]{1,6})(?:\r\n|[ \t\r\n\f])?|\\(.)/g, (_match, hex, escapedChar) => {
		if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
		return escapedChar ?? "";
	});
}

export function sanitizeHtml(html: string): string {
	if (!html) return "";
	return DOMPurify.sanitize(html, { ...RICH_TEXT_CONFIG, RETURN_TRUSTED_TYPE: false }) as string;
}

export function sanitizeCss(css: string): string {
	if (!css) return "";

	const normalized = decodeCssEscapes(stripCssComments(css));

	const preSanitized = normalized
		.replace(/javascript\s*:/gi, "")
		.replace(/expression\s*\(/gi, "")
		.replace(/behavior\s*:[^;}]*/gi, "")
		.replace(/-moz-binding\s*:[^;}]*/gi, "");

	const sanitized = preSanitized
		.replace(/@import[^;]*;/gi, "")
		.replace(/@font-face\s*\{[^}]*\}/gi, "")
		.replace(/\b(?:url|image-set|cross-fade)\s*\([^)]*\)/gi, "")
		.replace(/^\s*src\s*:[^;]*;?/gim, "");

	return sanitizePlainTextContent(sanitized);
}

export function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
