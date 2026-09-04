import { writeFileSync } from "node:fs";
import { describe, it } from "vitest";
import { parseResumeText } from "./plain-text";

describe("dbg", () => {
	it("dumps", () => {
		const data = parseResumeText(
			"EXPERIENCE\nACME CORPORATION\nSenior Engineer\nBerlin, Germany\nJan 2020 - Present\n• Led the rewrite\n",
		);
		writeFileSync(
			"/tmp/dbg.json",
			JSON.stringify({ custom: data.customSections, exp: data.sections.experience.items }, null, 1),
		);
	});
});
