import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const templatesDir = fileURLToPath(new URL("../", import.meta.url));

const templatePageFiles = readdirSync(templatesDir, { withFileTypes: true }).flatMap((entry) => {
	if (!entry.isDirectory() || entry.name === "shared") return [];

	const templateDir = join(templatesDir, entry.name);
	const pageFile = readdirSync(templateDir).find((file) => file.endsWith("Page.tsx"));

	return pageFile ? [join(templateDir, pageFile)] : [];
});

describe("rich text template styles", () => {
	it.each(
		templatePageFiles.map((file) => [basename(file), file]),
	)("%s keeps list item rich text on the global body line height", (_name, file) => {
		const source = readFileSync(file, "utf8");
		const richListItemContentBlock = source.match(/richListItemContent:\s*{(?<body>[\s\S]*?)^\s*},/m);

		expect(richListItemContentBlock?.groups?.body).toBeDefined();
		expect(richListItemContentBlock?.groups?.body).toContain("...bodyText");
		expect(richListItemContentBlock?.groups?.body).not.toMatch(/\blineHeight:/);
	});
});
