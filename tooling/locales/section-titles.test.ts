import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { generateSectionTitleCatalog } from "./section-titles";

it("keeps PDF headings synchronized with the source Lingui catalogs", async () => {
	const catalogs = fileURLToPath(new URL("../../apps/web/locales/", import.meta.url));
	const generated = await generateSectionTitleCatalog(catalogs);
	const committed = JSON.parse(
		await readFile(new URL("../../packages/pdf/src/section-title-catalog.json", import.meta.url), "utf8"),
	);
	expect(committed, "Run pnpm pdf:translations after updating translations.").toEqual(generated);
	expect(generated["es-ES"]?.Experience).toBe("Experiencia");
});
