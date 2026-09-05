import { describe, expect, it } from "vitest";
import { createHyphenationCallback } from "./hyphenation";

const german = createHyphenationCallback({ locale: "de-DE", automatic: true, cjk: false });

describe("document hyphenation", () => {
	it.each([
		["Softwareentwicklung", ["Soft", "ware", "ent", "wick", "lung"]],
		["Krankenhausverwaltung", ["Kran", "ken", "haus", "ver", "wal", "tung"]],
		["„Donaudampfschifffahrt.“", ["„Do", "nau", "dampf", "schiff", "fahrt.“"]],
	])("finds German breaks without changing %s", (word, parts) => {
		expect(german(word)).toEqual(parts);
		expect(german(word).join("")).toBe(word);
	});

	it.each([
		"https://example.com/Softwareentwicklung",
		"kontakt@Softwareentwicklung.de",
		"Softwareentwicklung.de",
		"Softwareentwicklung2",
		"software_entwicklung",
		"Software-Entwicklung",
		"Разработка",
		"تطوير",
		"การพัฒนา",
		"",
		" ",
		"42",
		"👩‍💻",
	])("leaves unmarked addresses, identifiers and other scripts intact: %s", (word) => {
		expect(german(word)).toEqual([word]);
	});

	it("honors authored soft hyphens instead of adding automatic breaks", () => {
		expect(german("Software\u00ADentwicklung")).toEqual(["Software", "entwicklung"]);
		expect(german("\u00ADSoft\u00AD\u00ADware\u00AD")).toEqual(["Soft", "ware"]);
		expect(german("\u00AD\u00AD")).toEqual([""]);
	});

	it("keeps decomposed combining marks with their letters", () => {
		const word = "A\u0308nderungsverfahren";
		const parts = german(word);
		expect(parts.join("")).toBe(word);
		expect(parts.length).toBeGreaterThan(1);
		expect(parts.every((part) => !/^\p{M}/u.test(part))).toBe(true);
	});

	it.each(["de-DE", "de-AT", "de-CH"])("uses German patterns for %s", (locale) => {
		expect(createHyphenationCallback({ locale, automatic: true, cjk: false })("Softwareentwicklung")).toEqual(
			german("Softwareentwicklung"),
		);
	});

	it.each([
		{ locale: "de-DE", automatic: false },
		{ locale: "en-US", automatic: true },
		{ locale: "fr-FR", automatic: true },
	])("preserves previous behavior for $locale / enabled=$automatic", (options) => {
		const callback = createHyphenationCallback({ ...options, cjk: false });
		for (const word of ["Softwareentwicklung", "Soft\u00ADware", " "]) expect(callback(word)).toEqual([word]);
	});

	it.each([false, true])("retains CJK break markers with automatic=%s", (automatic) => {
		const callback = createHyphenationCallback({ locale: "de-DE", automatic, cjk: true });
		expect(callback("中文")).toEqual(["中", "", "文", ""]);
		expect(callback(" ")).toEqual(["\u200C "]);
		expect(callback("تطوير")).toEqual(["تطوير"]);
	});
});
