import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(fileURLToPath(new URL("./sections.tsx", import.meta.url)), "utf8");

describe("ExperienceSection", () => {
	it("does not hide the item position header when role progression is present", () => {
		expect(source).not.toContain("item.roles.length === 0 && (hasPosition || hasSplitRowText(headerPeriod))");
	});

	it("does not repeat the summary period after rendering it in a role-progression header", () => {
		expect(source).not.toContain("item.roles.length > 0 && <Text>{item.period}</Text>");
	});
});
