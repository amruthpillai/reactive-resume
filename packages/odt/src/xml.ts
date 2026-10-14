const XML_ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&apos;",
};

/** Escapes text and attribute values for XML. */
export function escapeXml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => XML_ESCAPES[character] ?? character);
}

/**
 * XML 1.0 forbids most C0 control characters (only tab, newline and carriage return are legal).
 * Rich-text fields can carry stray controls from pasted content; drop them so the document stays valid.
 */
// oxlint-disable-next-line no-control-regex -- matching the illegal XML control range is the point.
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function escapeXmlText(value: string): string {
	return escapeXml(value.replace(INVALID_XML_CHARS, ""));
}
