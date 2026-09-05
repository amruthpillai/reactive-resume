import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { resume } from "./resume";

describe("resume sharing defaults", () => {
	it("shows public download buttons by default for new and migrated rows", () => {
		const column = getTableColumns(resume).showDownloadButtons;
		expect(column).toMatchObject({ name: "show_download_buttons", default: true, notNull: true });
	});
});
