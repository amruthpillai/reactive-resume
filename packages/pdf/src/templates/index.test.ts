import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const registry = readFileSync(fileURLToPath(new URL("./index.ts", import.meta.url)), "utf8");

describe("templatePages", () => {
	it("registers Scizor as a renderable template page", () => {
		expect(registry).toContain('import { ScizorPage } from "./scizor/ScizorPage";');
		expect(registry).toContain("scizor: ScizorPage");
	});

	it("exports the semantic manifest registry through the template index", () => {
		expect(registry).toContain("getTemplateSemanticManifest");
		expect(registry).toContain("TemplateSemanticManifest");
	});
});
