import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("templatePages", () => {
	it("registers Scizor as a renderable template page", () => {
		const registry = readFileSync(fileURLToPath(new URL("./index.ts", import.meta.url)), "utf8");

		expect(registry).toContain('import { ScizorPage } from "./scizor/ScizorPage";');
		expect(registry).toContain("scizor: ScizorPage");
	});

	it("resolves generated template variants through the schema base-template helper", () => {
		const registry = readFileSync(fileURLToPath(new URL("./index.ts", import.meta.url)), "utf8");

		expect(registry).toContain('import { getBaseTemplate } from "@reactive-resume/schema/templates";');
		expect(registry).toContain("templatePages[getBaseTemplate(template)]");
	});
});
