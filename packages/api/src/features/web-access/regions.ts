import { eq } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import { user } from "@reactive-resume/db/schema";
import { countryForTimeZone } from "@reactive-resume/utils/region";
import { careerService } from "../career/service";

/**
 * The countries a search should target. A chosen list wins and `[]` means anywhere; absent or null means
 * automatic, which takes the country of the account time zone, or none when that zone has no country.
 */
export function resolveRegions(stored: string[] | null | undefined, accountTimeZone: string): string[] {
	if (stored) return stored;
	const country = countryForTimeZone(accountTimeZone);
	return country ? [country] : [];
}

/** A user's resolved search regions and preferred locations, from one profile read and one account read. */
export async function searchScope(
	userId: string,
	deviceTimeZone?: string | undefined,
): Promise<{ regions: string[]; locations: string[] }> {
	const [profile, [owner]] = await Promise.all([
		careerService.profile(userId),
		db.select({ timezone: user.timezone }).from(user).where(eq(user.id, userId)),
	]);
	const resolved =
		profile.searchRegions === undefined &&
		owner?.timezone === "UTC" &&
		deviceTimeZone &&
		countryForTimeZone(deviceTimeZone)
			? await careerService.initializeSearchRegions(userId, deviceTimeZone)
			: profile;
	return { regions: resolveRegions(resolved.searchRegions, owner?.timezone ?? "UTC"), locations: resolved.locations };
}
