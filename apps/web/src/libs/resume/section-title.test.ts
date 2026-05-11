import type { MessageDescriptor } from "@lingui/core";
import { describe, expect, it, vi } from "vitest";
import { createSectionTitleResolver } from "./section-title";

const makeTranslator = (translate: (d: MessageDescriptor) => string = (d) => d.message ?? "") => ({
	_: vi.fn(translate),
});

describe("createSectionTitleResolver", () => {
	it("returns the translated message for a built-in section", () => {
		const translator = makeTranslator((d) => (d.message === "Experience" ? "Erfahrung" : (d.message ?? "")));
		const resolve = createSectionTitleResolver(translator);

		const result = resolve({
			sectionId: "experience",
			locale: "en-US",
			sectionKind: "builtin",
			defaultEnglishTitle: "Experience",
		});

		expect(result).toBe("Erfahrung");
		expect(translator._).toHaveBeenCalledTimes(1);
	});

	it("returns the translated message for a custom section by its type", () => {
		const translator = makeTranslator((d) => (d.message === "Cover Letter" ? "Anschreiben" : (d.message ?? "")));
		const resolve = createSectionTitleResolver(translator);

		const result = resolve({
			sectionId: "custom-1",
			locale: "en-US",
			sectionKind: "custom",
			customSectionType: "cover-letter",
			defaultEnglishTitle: "Cover Letter",
		});

		expect(result).toBe("Anschreiben");
	});

	it("falls back to defaultEnglishTitle when the section type is unknown", () => {
		const translator = makeTranslator();
		const resolve = createSectionTitleResolver(translator);

		const result = resolve({
			sectionId: "unknown-section",
			locale: "en-US",
			sectionKind: "builtin",
			defaultEnglishTitle: "Fallback Title",
		});

		expect(result).toBe("Fallback Title");
	});

	it("falls back to the sectionId when neither title nor known type", () => {
		const translator = makeTranslator();
		const resolve = createSectionTitleResolver(translator);

		const result = resolve({
			sectionId: "mystery",
			locale: "en-US",
			sectionKind: "builtin",
		});

		expect(result).toBe("mystery");
	});

	it("falls back to defaultEnglishTitle when translator returns empty string", () => {
		const translator = {
			_: vi.fn(() => ""),
		};
		const resolve = createSectionTitleResolver(translator);

		const result = resolve({
			sectionId: "skills",
			locale: "en-US",
			sectionKind: "builtin",
			defaultEnglishTitle: "Habilidades",
		});

		expect(result).toBe("Habilidades");
	});

	it("falls back to sectionId when translator returns empty and no default given", () => {
		const translator = { _: vi.fn(() => "") };
		const resolve = createSectionTitleResolver(translator);

		const result = resolve({
			sectionId: "languages",
			locale: "en-US",
			sectionKind: "builtin",
		});

		expect(result).toBe("languages");
	});

	it("resolves all known built-in section ids without errors", () => {
		const translator = makeTranslator();
		const resolve = createSectionTitleResolver(translator);

		const ids = [
			"summary",
			"profiles",
			"experience",
			"education",
			"projects",
			"skills",
			"languages",
			"interests",
			"awards",
			"certifications",
			"publications",
			"volunteer",
			"references",
		] as const;

		for (const sectionId of ids) {
			const result = resolve({ sectionId, locale: "en-US", sectionKind: "builtin" });
			expect(typeof result).toBe("string");
			expect(result.length).toBeGreaterThan(0);
		}
	});
});
