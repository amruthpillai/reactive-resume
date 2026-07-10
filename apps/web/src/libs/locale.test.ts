import { describe, expect, it } from "vitest";
import { isLocale, resolveLocale } from "./locale";

describe("isLocale", () => {
	it("returns true for known locale en-US", () => {
		expect(isLocale("en-US")).toBe(true);
	});

	it("returns true for Kurdish Sorani ckb-IQ", () => {
		expect(isLocale("ckb-IQ")).toBe(true);
	});

	it("returns true for de-DE", () => {
		expect(isLocale("de-DE")).toBe(true);
	});

	it("returns true for zh-CN", () => {
		expect(isLocale("zh-CN")).toBe(true);
	});

	it("returns false for unknown locale", () => {
		expect(isLocale("xx-YY")).toBe(false);
	});

	it("returns false for empty string", () => {
		expect(isLocale("")).toBe(false);
	});

	it("returns false for malformed locale", () => {
		expect(isLocale("not a locale")).toBe(false);
	});

	it("is case-sensitive", () => {
		expect(isLocale("en-us")).toBe(false);
	});
});

describe("resolveLocale", () => {
	it("returns the locale unchanged when valid", () => {
		expect(resolveLocale("fr-FR")).toBe("fr-FR");
	});

	it("returns en-US default for invalid locale", () => {
		expect(resolveLocale("xx-YY")).toBe("en-US");
	});

	it("returns en-US default for empty string", () => {
		expect(resolveLocale("")).toBe("en-US");
	});
});
