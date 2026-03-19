const SAFE_DOCX_LINK_SCHEMES = new Set(["http:", "https:", "mailto:"]);

export function toSafeDocxLink(value: string): string | null {
  const input = value.trim();
  if (!input) return null;

  if (input.startsWith("mailto:")) {
    const email = input.slice("mailto:".length).trim();
    if (!email) return null;
    return `mailto:${email}`;
  }

  try {
    const url = new URL(input);
    if (!SAFE_DOCX_LINK_SCHEMES.has(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}
