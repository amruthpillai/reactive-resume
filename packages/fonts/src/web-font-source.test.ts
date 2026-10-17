import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalUrl = "https://cdn.jsdelivr.net/gh/bitmaks/cm-web-fonts@latest/font/Bright/cmunbmr.woff";

beforeEach(() => {
	vi.resetModules();
	vi.stubEnv("WEB_FONT_BASE_URL", undefined);
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("Computer Modern font mirror", () => {
	it.each([undefined, ""])("keeps the CDN URL when the base is %s", async (baseUrl) => {
		vi.stubEnv("WEB_FONT_BASE_URL", baseUrl);
		const { getWebFontSource } = await import("./index");
		expect(getWebFontSource("Computer Modern Bright")).toBe(originalUrl);
	});

	it.each([
		"https://fonts.example.com/cm",
		"https://fonts.example.com/cm/",
		"https://fonts.example.com/cm///",
		" https://fonts.example.com/cm/ ",
	])("normalizes whitespace and trailing slashes in %s", async (baseUrl) => {
		vi.stubEnv("WEB_FONT_BASE_URL", baseUrl);
		const { getWebFontSource } = await import("./index");
		expect(getWebFontSource("Computer Modern Bright")).toBe("https://fonts.example.com/cm/font/Bright/cmunbmr.woff");
		expect(getWebFontSource("Computer Modern Bright", "700", true)).toBe(
			"https://fonts.example.com/cm/font/Bright/cmunbxo.woff",
		);
		expect(getWebFontSource("Computer Modern Bright", "100")).toBe(
			"https://fonts.example.com/cm/font/Bright/cmunbmr.woff",
		);
	});

	it("leaves Google fonts and picker previews unchanged", async () => {
		vi.stubEnv("WEB_FONT_BASE_URL", "https://fonts.example.com/cm");
		const { getWebFontSource, getWebFont } = await import("./index");
		expect(getWebFontSource("Roboto")).toBe(getWebFont("Roboto")?.files["400"]);
		expect(getWebFontSource("Roboto")).toMatch(/^https:\/\/fonts\.gstatic\.com\//);
		expect(getWebFont("Computer Modern Bright")?.preview).toBe(originalUrl);
	});
});
