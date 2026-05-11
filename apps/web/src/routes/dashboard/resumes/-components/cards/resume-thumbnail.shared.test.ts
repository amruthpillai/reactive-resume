import { describe, expect, it } from "vitest";
import {
	getResumeThumbnailCacheKey,
	getResumeThumbnailRenderSize,
	RESUME_THUMBNAIL_TARGET_WIDTH,
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
	it("uses the default target width when not provided", () => {
		const size = getResumeThumbnailRenderSize({ width: 800, height: 1200 });

		expect(size.width).toBe(RESUME_THUMBNAIL_TARGET_WIDTH);
		// Scale = 420/800 = 0.525 → height rounds to 630
		expect(size.height).toBe(630);
		expect(size.scale).toBeCloseTo(0.525, 5);
	});

	it("scales relative to the provided target width", () => {
		const size = getResumeThumbnailRenderSize({ width: 800, height: 1200 }, 400);
		expect(size.width).toBe(400);
		expect(size.scale).toBeCloseTo(0.5, 5);
		expect(size.height).toBe(600);
	});

	it("clamps pixelRatio to a minimum of 1", () => {
		const a = getResumeThumbnailRenderSize({ width: 800, height: 1200 }, 400, 0.5);
		const b = getResumeThumbnailRenderSize({ width: 800, height: 1200 }, 400, 1);
		expect(a).toEqual(b);
	});

	it("clamps pixelRatio to a maximum of 2", () => {
		const a = getResumeThumbnailRenderSize({ width: 800, height: 1200 }, 400, 3);
		const b = getResumeThumbnailRenderSize({ width: 800, height: 1200 }, 400, 2);
		expect(a).toEqual(b);
	});

	it("multiplies width/height by pixelRatio when within bounds", () => {
		const size = getResumeThumbnailRenderSize({ width: 800, height: 1200 }, 400, 2);
		// pageScale = 0.5, outputScale = 2 → width = 800, height = 1200
		expect(size.width).toBe(800);
		expect(size.height).toBe(1200);
		expect(size.scale).toBeCloseTo(1, 5);
	});

	it("rounds the output dimensions to integers", () => {
		const size = getResumeThumbnailRenderSize({ width: 793, height: 1123 }, 421, 1.5);
		expect(Number.isInteger(size.width)).toBe(true);
		expect(Number.isInteger(size.height)).toBe(true);
	});
});
