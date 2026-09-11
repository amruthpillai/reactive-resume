import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const templatesDir = fileURLToPath(new URL("../", import.meta.url));
// ponytail: richListItemContent moved to shared factory; guard the factory directly.
const factoryFile = fileURLToPath(new URL("./base-template-styles.ts", import.meta.url));

const templatePageFiles = readdirSync(templatesDir, { withFileTypes: true }).flatMap((entry) => {
	if (!entry.isDirectory() || entry.name === "shared") return [];

	const templateDir = join(templatesDir, entry.name);
	const pageFile = readdirSync(templateDir).find((file) => file.endsWith("Page.tsx"));

	return pageFile ? [join(templateDir, pageFile)] : [];
});

describe("rich text template styles", () => {
	// The shared factory owns richListItemContent for all 15 templates.
	it("base factory keeps list item rich text on the global body line height", () => {
		const source = readFileSync(factoryFile, "utf8");
		const richListItemContentBlock = source.match(/richListItemContent:\s*{(?<body>[\s\S]*?)^\s*},/m);

		expect(richListItemContentBlock?.groups?.body).toBeDefined();
		expect(richListItemContentBlock?.groups?.body).toContain("...bodyText");
		expect(richListItemContentBlock?.groups?.body).not.toMatch(/\blineHeight:/);
	});

	it.each(templatePageFiles.map((file) => [basename(file), file]))(
		"%s keeps list item rich text on the global body line height",
		(_name, file) => {
			const source = readFileSync(file, "utf8");

			if (source.includes("createBaseTemplateStyles")) {
				// Factory handles richListItemContent; guard is on the factory test above.
				expect(source).toContain("createBaseTemplateStyles");
				return;
			}

			// Legacy: template defines richListItemContent inline — no lineHeight override allowed.
			const richListItemContentBlock = source.match(/richListItemContent:\s*{(?<body>[\s\S]*?)^\s*},/m);
			expect(richListItemContentBlock?.groups?.body).toBeDefined();
			expect(richListItemContentBlock?.groups?.body).toContain("...bodyText");
			expect(richListItemContentBlock?.groups?.body).not.toMatch(/\blineHeight:/);
		},
	);
});
