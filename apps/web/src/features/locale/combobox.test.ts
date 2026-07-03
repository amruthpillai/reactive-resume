// @vitest-environment happy-dom

import { beforeAll, describe, expect, it } from "vitest";
import { i18n } from "@lingui/core";
import { localeMap } from "@/libs/locale";
import { getLocaleOptions } from "./combobox";

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

describe("getLocaleOptions", () => {
	it("returns one option per entry in localeMap", () => {
		const options = getLocaleOptions();
		expect(options).toHaveLength(Object.keys(localeMap).length);
	});

	it("uses the locale code as the value", () => {
		const options = getLocaleOptions();
		const values = options.map((opt) => opt.value);
		expect(values).toContain("en-US");
		expect(values).toContain("de-DE");
	});

	it("makes each option searchable by translated name and ISO code", () => {
		const options = getLocaleOptions();
		const enUS = options.find((opt) => opt.value === "en-US");
		expect(enUS?.label).toBeTruthy();
		// Plain-text name for the collapsed trigger.
		expect(typeof enUS?.textValue).toBe("string");
		// Searchable by the ISO code and the translated name regardless of the active UI locale.
		expect(enUS?.keywords).toContain("en-us");
		expect(enUS?.keywords).toContain(enUS?.textValue);
	});

	it("uses unique values for every option", () => {
		const values = getLocaleOptions().map((opt) => opt.value);
		expect(new Set(values).size).toBe(values.length);
	});
});
