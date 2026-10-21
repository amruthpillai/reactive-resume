import z from "zod";
import { ZONE_COUNTRY } from "./region-zones";

const COUNTRY_CODES: ReadonlySet<string> = new Set(Object.values(ZONE_COUNTRY));

/** An uppercase ISO 3166-1 alpha-2 code for a country that has an IANA time zone, such as "DE". */
export const countryCodeSchema = z
	.string()
	.regex(/^[A-Z]{2}$/)
	.refine((code) => COUNTRY_CODES.has(code), "Choose a valid country.");

/** Up to three distinct countries a user's web searches should target. */
export const searchRegionsSchema = z
	.array(countryCodeSchema)
	.max(3)
	.refine((codes) => new Set(codes).size === codes.length, "Countries must be distinct.")
	.nullable()
	.optional();

/** The country an IANA time zone belongs to, or null for UTC, Etc/* and unknown names. */
export function countryForTimeZone(timeZone: string): string | null {
	return Object.hasOwn(ZONE_COUNTRY, timeZone) ? (ZONE_COUNTRY[timeZone] ?? null) : null;
}

/** The localized country name for a code, falling back to the code itself. */
export function countryName(code: string, locale: string): string {
	try {
		return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
	} catch {
		return code;
	}
}
