import { describe, expect, it } from "vitest";
import { DEFAULT_BUILDER_PREVIEW_PAGE_LAYOUT, getNextBuilderPreviewPageLayout } from "./page-layout";

describe("DEFAULT_BUILDER_PREVIEW_PAGE_LAYOUT", () => {
	it("defaults to horizontal", () => {
		expect(DEFAULT_BUILDER_PREVIEW_PAGE_LAYOUT).toBe("horizontal");
	});
});

describe("getNextBuilderPreviewPageLayout", () => {
	it("returns vertical when given horizontal", () => {
		expect(getNextBuilderPreviewPageLayout("horizontal")).toBe("vertical");
	});

	it("returns horizontal when given vertical", () => {
		expect(getNextBuilderPreviewPageLayout("vertical")).toBe("horizontal");
	});

	it("is its own inverse", () => {
		const start: "horizontal" | "vertical" = "horizontal";
		const back = getNextBuilderPreviewPageLayout(getNextBuilderPreviewPageLayout(start));
		expect(back).toBe(start);
	});
});
