import { describe, expect, it } from "vitest";
import {
	getResumeThumbnailCacheKey,
	getResumeThumbnailRenderSize,
	getResumeThumbnailSize,
} from "./resume-thumbnail.shared";

describe("getResumeThumbnailCacheKey", () => {
	it("composes id and updated-at epoch milliseconds with a colon", () => {
		const date = new Date("2024-01-15T00:00:00.000Z");
		expect(getResumeThumbnailCacheKey("abc", date)).toBe(`abc:${date.getTime()}`);
	});

	it("differs when updatedAt changes", () => {
		const id = "resume-1";
		const a = getResumeThumbnailCacheKey(id, new Date(1000));
		const b = getResumeThumbnailCacheKey(id, new Date(2000));
		expect(a).not.toBe(b);
	});
});

describe("getResumeThumbnailRenderSize", () => {
	it("covers the measured 607 CSS pixel card at DPR 3", () => {
		const target = getResumeThumbnailSize({ width: 607, height: 858.47 }, 3);
		const size = getResumeThumbnailRenderSize({ width: 595.28, height: 841.89 }, target);
		expect(size.width).toBeGreaterThanOrEqual(1821);
		expect(size.height).toBeGreaterThanOrEqual(2575);
	});

	it("fits landscape pages within the measured container", () => {
		const size = getResumeThumbnailRenderSize({ width: 1200, height: 800 }, { width: 600, height: 900 });
		expect(size).toEqual({ width: 600, height: 400, scale: 0.5 });
	});

	it("fits tall unpaginated pages by height rather than allocating their full width", () => {
		const size = getResumeThumbnailRenderSize({ width: 600, height: 12000 }, { width: 600, height: 900 });
		expect(size).toEqual({ width: 45, height: 900, scale: 0.075 });
	});

	it("bounds extreme zoom and viewport sizes without stretching the page", () => {
		const target = getResumeThumbnailSize({ width: 5000, height: 7071 }, 8);
		const size = getResumeThumbnailRenderSize({ width: 595.28, height: 841.89 }, target);
		expect(size.width * size.height).toBeLessThanOrEqual(2048 * 3072);
		expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(3072);
		expect(size.width / size.height).toBeCloseTo(595.28 / 841.89, 2);
	});

	it("enforces the canvas budget when retained width and height came from different size buckets", () => {
		const size = getResumeThumbnailRenderSize({ width: 595.28, height: 841.89 }, { width: 2112, height: 2985 });
		expect(size.width * size.height).toBeLessThanOrEqual(2048 * 3072);
	});

	it("groups small fractional layout changes into the same physical size", () => {
		const a = getResumeThumbnailSize({ width: 295.5, height: 417.93 }, 2);
		const b = getResumeThumbnailSize({ width: 296, height: 418.64 }, 2);
		expect(a).toEqual(b);
		expect(a.width).toBeGreaterThanOrEqual(592);
	});
});
