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

	it("populates label and keywords with the same translated string", () => {
		const options = getLocaleOptions();
		const enUS = options.find((opt) => opt.value === "en-US");
		expect(enUS?.label).toBeTruthy();
		expect(enUS?.keywords).toEqual([enUS?.label]);
	});

	it("uses unique values for every option", () => {
		const values = getLocaleOptions().map((opt) => opt.value);
		expect(new Set(values).size).toBe(values.length);
	});
});
