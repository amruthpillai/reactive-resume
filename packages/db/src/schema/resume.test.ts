import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { resume, resumeRetiredLink } from "./resume";

describe("resume sharing defaults", () => {
	it("shows public download buttons by default for new and migrated rows", () => {
		const column = getTableColumns(resume).showDownloadButtons;
		expect(column).toMatchObject({ name: "show_download_buttons", default: true, notNull: true });
	});
});

describe("retired resume links", () => {
	it("stores only aggregate path-attempt data with bounded lookup indexes", () => {
		const columns = getTableColumns(resumeRetiredLink);
		const config = getTableConfig(resumeRetiredLink);

		expect(Object.keys(columns)).toEqual([
			"id",
			"userId",
			"resumeId",
			"username",
			"slug",
			"retiredAt",
			"attemptCount",
			"lastAttemptAt",
		]);
		expect(columns.attemptCount).toMatchObject({ name: "attempt_count", default: 0, notNull: true });
		expect(columns.lastAttemptAt).toMatchObject({ name: "last_attempt_at", notNull: false });
		expect(config.uniqueConstraints).toHaveLength(1);
		expect(config.indexes).toHaveLength(1);
		expect(config.foreignKeys).toHaveLength(2);
	});
});
