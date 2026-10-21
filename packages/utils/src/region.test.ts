import { describe, expect, it } from "vite-plus/test";
import { countryCodeSchema, countryForTimeZone, countryName, searchRegionsSchema } from "./region";

describe("countryForTimeZone", () => {
	it("maps canonical zones to their country", () => {
		expect(countryForTimeZone("Asia/Singapore")).toBe("SG");
		expect(countryForTimeZone("Australia/Melbourne")).toBe("AU");
		expect(countryForTimeZone("Europe/Berlin")).toBe("DE");
	});

	it("resolves legacy link names through their canonical zone", () => {
		expect(countryForTimeZone("Asia/Calcutta")).toBe("IN");
		expect(countryForTimeZone("Asia/Saigon")).toBe("VN");
	});

	it("prefers the zone a legacy name was meant for over a merged canonical zone", () => {
		expect(countryForTimeZone("Iceland")).toBe("IS");
		expect(countryForTimeZone("Pacific/Truk")).toBe("FM");
	});

	it("returns null for UTC, Etc zones and unknown names", () => {
		expect(countryForTimeZone("UTC")).toBeNull();
		expect(countryForTimeZone("Etc/GMT+5")).toBeNull();
		expect(countryForTimeZone("CET")).toBeNull();
		expect(countryForTimeZone("Not/AZone")).toBeNull();
	});
});

describe("countryCodeSchema", () => {
	it("accepts codes present in the table and rejects others", () => {
		expect(countryCodeSchema.safeParse("SG").success).toBe(true);
		expect(countryCodeSchema.safeParse("XX").success).toBe(false);
		expect(countryCodeSchema.safeParse("sg").success).toBe(false);
	});
});

describe("searchRegionsSchema", () => {
	it("accepts valid lists, empty, null and undefined", () => {
		expect(searchRegionsSchema.safeParse(["DE", "FR"]).success).toBe(true);
		expect(searchRegionsSchema.safeParse([]).success).toBe(true);
		expect(searchRegionsSchema.safeParse(null).success).toBe(true);
		expect(searchRegionsSchema.safeParse(undefined).success).toBe(true);
	});

	it("rejects lowercase, unknown, duplicate and more than three codes", () => {
		expect(searchRegionsSchema.safeParse(["de"]).success).toBe(false);
		expect(searchRegionsSchema.safeParse(["XX"]).success).toBe(false);
		expect(searchRegionsSchema.safeParse(["DE", "DE"]).success).toBe(false);
		expect(searchRegionsSchema.safeParse(["DE", "FR", "IT", "ES"]).success).toBe(false);
	});
});

describe("countryName", () => {
	it("localises the country name", () => {
		expect(countryName("FR", "de-DE")).toBe("Frankreich");
	});

	it("falls back to the code for an invalid locale", () => {
		expect(countryName("FR", "not a locale")).toBe("FR");
	});
});
