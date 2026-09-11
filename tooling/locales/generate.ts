import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { generateSectionTitleCatalog } from "./section-titles";

const catalogs = fileURLToPath(new URL("../../apps/web/locales/", import.meta.url));
const output = new URL("../../packages/pdf/src/section-title-catalog.json", import.meta.url);
const translations = await generateSectionTitleCatalog(catalogs);
await writeFile(output, `${JSON.stringify(translations, null, "\t")}\n`);
console.log(`Updated PDF section titles for ${Object.keys(translations).length} locales.`);
