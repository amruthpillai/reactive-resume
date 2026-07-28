import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pageFiles = [
	"azurill/AzurillPage.tsx",
	"bronzor/BronzorPage.tsx",
	"chikorita/ChikoritaPage.tsx",
	"ditgar/DitgarPage.tsx",
	"ditto/DittoPage.tsx",
	"gengar/GengarPage.tsx",
	"glalie/GlaliePage.tsx",
	"kakuna/KakunaPage.tsx",
	"lapras/LaprasPage.tsx",
	"leafish/LeafishPage.tsx",
	"meowth/MeowthPage.tsx",
	"onyx/OnyxPage.tsx",
	"pikachu/PikachuPage.tsx",
	"rhyhorn/RhyhornPage.tsx",
	"scizor/ScizorPage.tsx",
];

const readTemplate = (file: string) => {
	const path = fileURLToPath(new URL(file, import.meta.url));
	return readFileSync(path, "utf8");
};

describe("cover letter PDF layout", () => {
	it("derives shared page props in the document renderer", () => {
		const source = readTemplate("../document.tsx");

		expect(source).toContain('from "./templates/shared/cover-letter"');
		expect(source).toContain('from "./templates/shared/page-size"');
		expect(source).toContain("showHeader={shouldShowResumeHeader");
		expect(source).toContain("pageSize={pageSize}");
		expect(source).toContain("pageMinHeightStyle={pageMinHeightStyle}");
		expect(source).toContain("pageNumber={index + 1}");
	});

	it.each(pageFiles)("%s renders the shared page props", (file) => {
		const source = readTemplate(file);

		expect(source, basename(file)).toContain("pageSize, pageMinHeightStyle, showHeader, pageNumber");
		expect(source, basename(file)).toContain("size={semanticPageSize ?? pageSize}");
		expect(source, basename(file)).toContain("pageNodeKey={pageNodeKey}");
		expect(source, basename(file)).toContain("showHeader &&");
		expect(source, basename(file)).not.toContain('from "../shared/cover-letter"');
		expect(source, basename(file)).not.toContain('from "../shared/page-size"');
	});
});
