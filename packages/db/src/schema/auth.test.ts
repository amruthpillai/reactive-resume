import { describe, expect, it } from "vitest";
import { getTableColumns, getTableName } from "drizzle-orm";
import {
	account,
	apikey,
	jwks,
	oauthAccessToken,
	oauthClient,
	oauthConsent,
	oauthRefreshToken,
	passkey,
	session,
	twoFactor,
	user,
	verification,
} from "./auth";

const cases: Array<{
	name: string;
	table: Parameters<typeof getTableColumns>[0];
	columns: string[];
}> = [
	{
		name: "user",
		table: user,
		columns: ["id", "email", "name", "image", "createdAt", "updatedAt"],
	},
	{
		name: "session",
		table: session,
		columns: ["id", "userId", "token", "expiresAt"],
	},
	{
		name: "account",
		table: account,
		columns: ["id", "userId", "providerId", "accountId"],
	},
	{
		name: "verification",
		table: verification,
		columns: ["id", "identifier", "value", "expiresAt"],
	},
	{
		name: "two_factor",
		table: twoFactor,
		columns: ["id", "userId", "secret"],
	},
	{
		name: "passkey",
		table: passkey,
		columns: ["id", "userId", "publicKey"],
	},
	{
		name: "apikey",
		table: apikey,
		columns: ["id", "name", "key", "referenceId"],
	},
	{ name: "jwks", table: jwks, columns: ["id", "publicKey", "privateKey"] },
	{
		name: "oauth_client",
		table: oauthClient,
		columns: ["id", "clientId", "clientSecret", "name", "userId", "redirectUris"],
	},
	{
		name: "oauth_refresh_token",
		table: oauthRefreshToken,
		columns: ["id", "userId", "clientId"],
	},
	{
		name: "oauth_access_token",
		table: oauthAccessToken,
		columns: ["id", "userId", "clientId", "refreshId"],
	},
	{
		name: "oauth_consent",
		table: oauthConsent,
		columns: ["id", "userId", "clientId"],
	},
];

describe("auth tables", () => {
	it.each(cases)("$name maps to the expected SQL name", ({ name, table }) => {
		expect(getTableName(table)).toBe(name);
	});

	it.each(cases)("$name exposes the required columns", ({ table, columns }) => {
		const tableColumns = getTableColumns(table);
		for (const expected of columns) {
			expect(tableColumns[expected as keyof typeof tableColumns], expected).toBeDefined();
		}
	});
});
