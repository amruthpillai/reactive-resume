import { describe, expect, it, vi } from "vitest";
import { decode } from "fast-png";
import { getPictureShadow } from "./picture-shadow";

function pixels(borderRadius = 0, shadowColor = "rgba(0, 0, 255, 0.5)") {
	const shadow = getPictureShadow({ width: 100, height: 100, borderRadius, shadowColor, shadowWidth: 10 });
	if (!shadow) throw new Error("Missing shadow");
	const png = decode(Uint8Array.from(atob(shadow.src.split(",")[1] ?? ""), (char) => char.charCodeAt(0)));
	return { shadow, png, alpha: (x: number, y: number) => png.data[(y * png.width + x) * 4 + 3] ?? 0 };
}

describe("portable picture shadow", () => {
	it("bounds raster work for broad shadows while preserving their soft falloff", () => {
		const shadow = getPictureShadow({ width: 100, height: 100, shadowWidth: 50, shadowColor: "#000000" });
		if (!shadow) throw new Error("Missing shadow");
		const png = decode(Uint8Array.from(atob(shadow.src.split(",")[1] ?? ""), (char) => char.charCodeAt(0)));
		expect(png.width).toBeLessThanOrEqual(192);
		expect(png.height).toBeLessThanOrEqual(192);
		const scale = png.width / (100 + shadow.extent * 2);
		const alpha = (x: number) =>
			png.data[
				(Math.floor((50 + shadow.extent) * scale) * png.width + Math.floor((x + shadow.extent) * scale)) * 4 + 3
			] ?? 0;
		expect(alpha(-5)).toBeGreaterThan(85);
		expect(alpha(-5)).toBeLessThan(115);
		expect(alpha(-30)).toBeLessThan(alpha(-5));
	});
	it("omits shadows whose finite dimensions overflow derived raster bounds", () => {
		expect(
			getPictureShadow({ width: 100, height: 100, shadowWidth: Number.MAX_VALUE, shadowColor: "#000000" }),
		).toBeUndefined();
	});
	it("keeps the inside clear and softens outward symmetrically", () => {
		const { alpha } = pixels();
		expect(alpha(130, 130)).toBe(0);
		expect(alpha(27, 130)).toBeGreaterThan(alpha(15, 130));
		expect(alpha(15, 130)).toBeGreaterThan(alpha(1, 130));
		expect(alpha(27, 130)).toBe(alpha(232, 130));
		expect(alpha(27, 130)).toBeLessThan(128);
	});
	it("follows rounded corners and preserves transparent picture interiors", () => {
		const { alpha } = pixels(50);
		expect(alpha(130, 130)).toBe(0);
		expect(alpha(50, 50)).toBeGreaterThan(0);
		expect(alpha(130, 40)).toBe(0);
	});
	it("produces stable PNG bytes with independent caches", async () => {
		const expected = pixels().shadow.src;
		vi.resetModules();
		const fresh = await import("./picture-shadow");
		expect(
			fresh.getPictureShadow({
				width: 100,
				height: 100,
				borderRadius: 0,
				shadowColor: "rgba(0, 0, 255, 0.5)",
				shadowWidth: 10,
			})?.src,
		).toBe(expected);
	});
	it("bounds raster size for large pictures", () => {
		const shadow = getPictureShadow({ width: 2000, height: 1000, shadowWidth: 100, shadowColor: "#000000" });
		if (!shadow) throw new Error("Missing shadow");
		const png = decode(Uint8Array.from(atob(shadow.src.split(",")[1] ?? ""), (char) => char.charCodeAt(0)));
		expect(png.width).toBeLessThanOrEqual(512);
		expect(png.height).toBeLessThanOrEqual(512);
	});
});
