import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { account } from "./auth";

describe("Better Auth account schema", () => {
	it("does not require the retired issuer identity key", () => {
		const config = getTableConfig(account);
		const issuer = config.columns.find((column) => column.name === "issuer");

		expect(issuer).toMatchObject({ name: "issuer", notNull: false });
		expect(config.indexes.map((index) => index.config.name)).not.toContain("account_issuer_account_id_unique_idx");
	});
});
