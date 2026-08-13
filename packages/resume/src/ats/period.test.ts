import { describe, expect, it } from "vitest";
import { isFutureEndpoint, isReversedPeriod, ONGOING_TOKENS_BY_LANGUAGE, parsePeriod, parseSingleDate } from "./period";

const NOW = new Date("2024-06-15T00:00:00Z");

describe("parsePeriod", () => {
	it.each([
		["Jan 2020 - Present", { start: { year: 2020, month: 1 }, ongoing: true }],
		["January 2020 – March 2022", { start: { year: 2020, month: 1 }, end: { year: 2022, month: 3 }, ongoing: false }],
		["Sept 2019 - Dec 2019", { start: { year: 2019, month: 9 }, end: { year: 2019, month: 12 }, ongoing: false }],
		["2020 - 2022", { start: { year: 2020 }, end: { year: 2022 }, ongoing: false }],
		["2020-2022", { start: { year: 2020 }, end: { year: 2022 }, ongoing: false }],
		["2020–2022", { start: { year: 2020 }, end: { year: 2022 }, ongoing: false }],
		["03/2020 - 06/2021", { start: { year: 2020, month: 3 }, end: { year: 2021, month: 6 }, ongoing: false }],
		["03/2020-06/2021", { start: { year: 2020, month: 3 }, end: { year: 2021, month: 6 }, ongoing: false }],
		["2020-03 - 2021-06", { start: { year: 2020, month: 3 }, end: { year: 2021, month: 6 }, ongoing: false }],
		["Mar 2020 to Present", { start: { year: 2020, month: 3 }, ongoing: true }],
		["Jan 2020 until now", { start: { year: 2020, month: 1 }, ongoing: true }],
		["Fall 2019 - Spring 2021", { start: { year: 2019, month: 9 }, end: { year: 2021, month: 3 }, ongoing: false }],
		["15/03/2020", { start: { year: 2020, month: 3 }, ongoing: false }],
	])("reads %s", (input, expected) => {
		expect(parsePeriod(input)).toEqual(expected);
	});

	it("treats an ISO year-month as one endpoint rather than a range", () => {
		expect(parsePeriod("2020-03")).toEqual({ start: { year: 2020, month: 3 }, ongoing: false });
	});

	it.each(["", "   ", "Summer of love", "sometime in 2020", "20-22", "Jan 2020 - Feb", "Present - 2020", "2020 -"])(
		"rejects %j",
		(input) => {
			expect(parsePeriod(input)).toBeNull();
		},
	);

	it.each(["Present", "Current", "Now", "Ongoing"])("rejects %j on its own, with no start date", (input) => {
		expect(parsePeriod(input)).toBeNull();
	});

	it.each([
		["2020 - heute", { year: 2020 }],
		["Jan 2020 - présent", { year: 2020, month: 1 }],
		["2020 - 現在", { year: 2020 }],
		["2020 - en cours", { year: 2020 }],
		["Mar 2021 - actualidad", { year: 2021, month: 3 }],
	])("reads %s as ongoing without knowing the word", (input, start) => {
		expect(parsePeriod(input)).toEqual({ start, ongoing: true });
	});

	it("reads localized ongoing tokens followed by ordinary punctuation", () => {
		expect(parsePeriod("2020 - heute.", "de-DE")).toEqual({ start: { year: 2020 }, ongoing: true });
	});

	it("does not mistake an incomplete month ending for an ongoing marker", () => {
		expect(parsePeriod("Jan 2020 - Feb")).toBeNull();
	});

	it.each(["2020 - unknown", "2020 - later", "2020 - tbd", "2020 - ???", "2020 - see below"])(
		"rejects %j rather than reading the ending as ongoing",
		(input) => {
			expect(parsePeriod(input)).toBeNull();
		},
	);

	it("does not treat a long phrase as an ongoing marker", () => {
		expect(parsePeriod("2020 - whenever we finally got around to shipping it")).toBeNull();
	});

	it("reads month names in the resume's own locale", () => {
		expect(parsePeriod("janvier 2020 - mars 2022", "fr-FR")).toEqual({
			start: { year: 2020, month: 1 },
			end: { year: 2022, month: 3 },
			ongoing: false,
		});
	});

	it("still reads English month names under a non-English locale", () => {
		expect(parsePeriod("Jan 2020 - Mar 2022", "fr-FR")).toEqual({
			start: { year: 2020, month: 1 },
			end: { year: 2022, month: 3 },
			ongoing: false,
		});
	});

	it("falls back to English when the locale tag is unusable", () => {
		expect(parsePeriod("Jan 2020", "not a locale")).toEqual({ start: { year: 2020, month: 1 }, ongoing: false });
	});
});

describe("parseSingleDate", () => {
	it.each([
		["March 2022", { year: 2022, month: 3 }],
		["2022", { year: 2022 }],
		["2022-11", { year: 2022, month: 11 }],
	])("reads %s", (input, expected) => {
		expect(parseSingleDate(input)).toEqual(expected);
	});

	it.each(["", "Present", "whenever", "13/2020"])("rejects %j", (input) => {
		expect(parseSingleDate(input)).toBeNull();
	});
});

describe("isReversedPeriod", () => {
	it("flags a period that runs backwards", () => {
		expect(isReversedPeriod({ year: 2022 }, { year: 2020 })).toBe(true);
	});

	it("reads a missing end month as the end of its year", () => {
		expect(isReversedPeriod({ year: 2020, month: 12 }, { year: 2020 })).toBe(false);
	});

	it("accepts a period inside a single year", () => {
		expect(isReversedPeriod({ year: 2020, month: 3 }, { year: 2020, month: 9 })).toBe(false);
	});
});

describe("isFutureEndpoint", () => {
	it("flags a start after the current month", () => {
		expect(isFutureEndpoint({ year: 2025, month: 1 }, NOW)).toBe(true);
	});

	it("accepts the current month", () => {
		expect(isFutureEndpoint({ year: 2024, month: 6 }, NOW)).toBe(false);
	});

	it("reads a missing month as the start of its year", () => {
		expect(isFutureEndpoint({ year: 2024 }, NOW)).toBe(false);
	});
});

describe("ONGOING_TOKENS_BY_LANGUAGE", () => {
	it("lists at least one token for every language it covers", () => {
		for (const [language, tokens] of Object.entries(ONGOING_TOKENS_BY_LANGUAGE)) {
			expect(tokens.length, language).toBeGreaterThan(0);
		}
	});

	it("stores every token lowercased, since lookups normalize that way", () => {
		for (const [language, tokens] of Object.entries(ONGOING_TOKENS_BY_LANGUAGE)) {
			for (const token of tokens) {
				expect(token, `${language}: ${token}`).toBe(token.toLowerCase());
				expect(token.trim(), language).toBe(token);
			}
		}
	});

	it("reads every listed token as an open-ended period", () => {
		for (const [language, tokens] of Object.entries(ONGOING_TOKENS_BY_LANGUAGE)) {
			for (const token of tokens) {
				expect(parsePeriod(`2020 - ${token}`, language), `${language}: ${token}`).toEqual({
					start: { year: 2020 },
					ongoing: true,
				});
			}
		}
	});
});
