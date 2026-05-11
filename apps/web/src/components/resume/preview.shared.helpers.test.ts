// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import {
	DEFAULT_PDF_PAGE_SIZE,
	getPreviewCanvasScale,
	getScaledPreviewPageSize,
	normalizeResumePreviewProps,
} from "./preview.shared";

describe("normalizeResumePreviewProps", () => {
	it("applies the documented defaults when fields are omitted", () => {
		const result = normalizeResumePreviewProps({});
		expect(result).toMatchObject({
			pageGap: 40,
			pageLayout: "horizontal",
			pageScale: 1,
			showPageNumbers: false,
		});
	});

	it("preserves supplied values and forwards extra props (className, data)", () => {
		const result = normalizeResumePreviewProps({
			className: "preview-class",
			pageGap: 16,
			pageLayout: "vertical",
			pageScale: 1.5,
			showPageNumbers: true,
		});

		expect(result.className).toBe("preview-class");
		expect(result.pageGap).toBe(16);
		expect(result.pageLayout).toBe("vertical");
		expect(result.pageScale).toBe(1.5);
		expect(result.showPageNumbers).toBe(true);
	});
});

describe("getScaledPreviewPageSize", () => {
	it("multiplies both dimensions by the scale", () => {
		const result = getScaledPreviewPageSize({ width: 100, height: 200 }, 2);
		expect(result).toEqual({ width: 200, height: 400 });
	});

	it("returns the default A4 page size unchanged when scaled by 1", () => {
		expect(getScaledPreviewPageSize(DEFAULT_PDF_PAGE_SIZE, 1)).toEqual(DEFAULT_PDF_PAGE_SIZE);
	});

	it("supports fractional scaling", () => {
		const result = getScaledPreviewPageSize({ width: 100, height: 200 }, 0.5);
		expect(result).toEqual({ width: 50, height: 100 });
	});
});

const setDevicePixelRatio = (value: number) => {
	Object.defineProperty(window, "devicePixelRatio", {
		writable: true,
		configurable: true,
		value,
	});
};

afterEach(() => {
	setDevicePixelRatio(1);
});

describe("getPreviewCanvasScale", () => {
	it("returns the desired render scale (4x) for small pages", () => {
		setDevicePixelRatio(1);
		// width * height * 4 * 4 = 100 * 100 * 16 = 160_000 ≪ 16_777_216 budget
		expect(getPreviewCanvasScale(100, 100)).toBe(4);
	});

	it("uses devicePixelRatio when it exceeds the desired 4x scale", () => {
		setDevicePixelRatio(8);
		// 50*50*8*8 = 160_000 ≪ budget, so we keep the 8x devicePixelRatio
		expect(getPreviewCanvasScale(50, 50)).toBe(8);
	});

	it("clamps the scale when the page would exceed the canvas pixel budget", () => {
		setDevicePixelRatio(1);
		const scale = getPreviewCanvasScale(2000, 3000);
		// Should NOT exceed the 4x desired scale and must satisfy the pixel budget.
		expect(scale).toBeLessThan(4);
		expect(scale * scale * 2000 * 3000).toBeLessThanOrEqual(16_777_216 + 1);
	});
});
