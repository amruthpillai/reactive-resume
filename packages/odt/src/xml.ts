const XML_ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&apos;",
};

/**
 * Characters XML 1.0 forbids: C0 controls other than tab, newline and carriage return, plus U+FFFE and U+FFFF.
 * Pasted text can carry them, and one is enough to make the whole document unreadable.
 */
// oxlint-disable-next-line no-control-regex -- matching the illegal XML control range is the point.
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

/** Escapes text or an attribute value for XML, dropping the characters XML 1.0 forbids. */
export function escapeXml(value: string): string {
	return value.replace(INVALID_XML_CHARS, "").replace(/[&<>"']/g, (character) => XML_ESCAPES[character] ?? character);
}
