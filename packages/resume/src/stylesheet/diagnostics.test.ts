import { expect, it } from "vitest";
import { SEMANTIC_CSS_DIAGNOSTIC_CATALOG_V1 } from "./diagnostics";

it("documents every supported media-query feature in the canonical diagnostic action", () => {
	expect(SEMANTIC_CSS_DIAGNOSTIC_CATALOG_V1.INVALID_MEDIA_QUERY.action).toBe(
		"Use orientation: portrait|landscape or width, min-width, max-width, height, min-height, or max-height with a Semantic CSS length.",
	);
});
