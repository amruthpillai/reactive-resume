import type { Style } from "@react-pdf/types";
import { encode } from "fast-png";
import { parseColorString, rgbaStringToHex } from "@reactive-resume/utils/color";

type PictureShadowStyle = Style & { shadowColor?: string; shadowWidth?: number };
type ShadowImage = { src: string; extent: number };
const cache = new Map<string, ShadowImage>();
const maxRasterSize = 512;
const maxBlurSigma = 16;

function contains(x: number, y: number, width: number, height: number, radii: number[]) {
	if (x < 0 || y < 0 || x >= width || y >= height) return false;
	const corner = (x < width / 2 ? 0 : 1) + (y < height / 2 ? 0 : 2);
	const radius = radii[corner] ?? 0;
	const cx = x < width / 2 ? radius : width - radius;
	const cy = y < height / 2 ? radius : height - radius;
	if ((x < radius || x > width - radius) && (y < radius || y > height - radius)) {
		return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
	}
	return true;
}

function convolve(input: Float32Array, width: number, height: number, kernel: number[], horizontal: boolean) {
	const output = new Float32Array(input.length);
	const radius = (kernel.length - 1) / 2;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let value = 0;
			for (let offset = -radius; offset <= radius; offset++) {
				const sx = horizontal ? x + offset : x;
				const sy = horizontal ? y : y + offset;
				if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
					value += (input[sy * width + sx] ?? 0) * (kernel[offset + radius] ?? 0);
				}
			}
			output[y * width + x] = value;
		}
	}
	return output;
}

/** Restores the original CSS box-shadow: zero offset/spread, sigma = half the blur radius. */
export function getPictureShadow(style: PictureShadowStyle): ShadowImage | undefined {
	const { width, height, shadowWidth: blur, shadowColor } = style;
	// Percentage dimensions are resolved later by Yoga; avoid guessing their shadow geometry.
	if (typeof width !== "number" || typeof height !== "number" || !blur || blur <= 0 || !shadowColor) return;
	if (![width, height, blur].every(Number.isFinite) || width <= 0 || height <= 0 || shadowColor === "transparent")
		return;
	const color = parseColorString(shadowColor) ?? parseColorString(rgbaStringToHex(shadowColor));
	if (!color || color.a <= 0) return;
	const resolveRadius = (value: unknown) => {
		if (typeof value === "number") return value;
		if (typeof value === "string" && value.endsWith("%"))
			return (Number.parseFloat(value) / 100) * Math.min(width, height);
		return 0;
	};
	const radii = [
		style.borderTopLeftRadius,
		style.borderTopRightRadius,
		style.borderBottomLeftRadius,
		style.borderBottomRightRadius,
	].map((value) => Math.max(0, Math.min(resolveRadius(value ?? style.borderRadius), width / 2, height / 2)));
	const key = JSON.stringify([width, height, blur, color, radii]);
	const cached = cache.get(key);
	if (cached) return cached;
	const extent = Math.ceil(blur * 1.5);
	const outerWidth = width + extent * 2;
	const outerHeight = height + extent * 2;
	if (!Number.isFinite(outerWidth) || !Number.isFinite(outerHeight)) return;
	// Lower the raster scale with broad blur, preserving its point-space width
	// while bounding the convolution kernel and synchronous render work.
	const scale = Math.min(2, maxRasterSize / Math.max(outerWidth, outerHeight), (maxBlurSigma * 2) / blur);
	const rasterWidth = Math.max(1, Math.ceil(outerWidth * scale));
	const rasterHeight = Math.max(1, Math.ceil(outerHeight * scale));
	const mask = new Float32Array(rasterWidth * rasterHeight);
	for (let y = 0; y < rasterHeight; y++) {
		for (let x = 0; x < rasterWidth; x++) {
			mask[y * rasterWidth + x] = contains((x + 0.5) / scale - extent, (y + 0.5) / scale - extent, width, height, radii)
				? 1
				: 0;
		}
	}
	const sigma = Math.max(0.5, (blur / 2) * scale);
	const kernelRadius = Math.ceil(3 * sigma);
	const weights = Array.from({ length: kernelRadius * 2 + 1 }, (_, index) =>
		Math.exp(-((index - kernelRadius) ** 2) / (2 * sigma ** 2)),
	);
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	const kernel = weights.map((weight) => weight / total);
	const blurred = convolve(
		convolve(mask, rasterWidth, rasterHeight, kernel, true),
		rasterWidth,
		rasterHeight,
		kernel,
		false,
	);
	const pixels = new Uint8Array(mask.length * 4);
	for (let index = 0; index < mask.length; index++) {
		pixels[index * 4] = color.r;
		pixels[index * 4 + 1] = color.g;
		pixels[index * 4 + 2] = color.b;
		// Outer box shadows never tint transparent pixels inside the picture's border box.
		pixels[index * 4 + 3] = Math.round(255 * color.a * (blurred[index] ?? 0) * (1 - (mask[index] ?? 0)));
	}
	const png = encode({ width: rasterWidth, height: rasterHeight, data: pixels, channels: 4, depth: 8 });
	let binary = "";
	for (const byte of png) binary += String.fromCharCode(byte);
	const result = { src: `data:image/png;base64,${btoa(binary)}`, extent };
	if (cache.size >= 8) cache.delete(cache.keys().next().value ?? "");
	cache.set(key, result);
	return result;
}
