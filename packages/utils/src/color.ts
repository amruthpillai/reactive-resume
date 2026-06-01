import type { ColorResult } from "@uiw/color-convert";
import { hsvaToHex, rgbaStringToHsva } from "@uiw/color-convert";

export function rgbaStringToHex(rgba: string): string {
	const color = parseColorString(rgba);
	if (color) return `#${toHexComponent(color.r)}${toHexComponent(color.g)}${toHexComponent(color.b)}`;

	const hsva = rgbaStringToHsva(rgba);
	return hsvaToHex(hsva);
}

function toHexComponent(value: number): string {
	return Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
}

export function parseColorString(value: string): ColorResult["rgba"] | null {
	const trimmed = value.trim();

	// Parse rgb/rgba colors
	const rgbMatch = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/);

	if (rgbMatch) {
		return {
			r: Number.parseInt(rgbMatch[1] ?? "0", 10),
			g: Number.parseInt(rgbMatch[2] ?? "0", 10),
			b: Number.parseInt(rgbMatch[3] ?? "0", 10),
			a: rgbMatch[4] ? Number.parseFloat(rgbMatch[4]) : 1,
		};
	}

	// Parse hex colors (convert to RGB)
	if (trimmed.startsWith("#")) {
		const hexMatch = trimmed.match(/^#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})$/i);
		if (hexMatch) {
			return {
				r: Number.parseInt(hexMatch[1] ?? "0", 16),
				g: Number.parseInt(hexMatch[2] ?? "0", 16),
				b: Number.parseInt(hexMatch[3] ?? "0", 16),
				a: 1,
			};
		}

		// Support 3-digit hex
		const hexMatch3 = trimmed.match(/^#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])$/i);
		if (hexMatch3) {
			return {
				r: Number.parseInt((hexMatch3[1] ?? "0") + (hexMatch3[1] ?? "0"), 16),
				g: Number.parseInt((hexMatch3[2] ?? "0") + (hexMatch3[2] ?? "0"), 16),
				b: Number.parseInt((hexMatch3[3] ?? "0") + (hexMatch3[3] ?? "0"), 16),
				a: 1,
			};
		}
	}

	return null;
}

/** Returns true if the given color string is perceptually dark (luminance < 128). */
export function isDarkColor(colorString: string): boolean {
	const color = parseColorString(colorString);
	if (!color) return false;
	const alpha = Math.max(0, Math.min(1, color.a ?? 1));
	const r = color.r * alpha + 255 * (1 - alpha);
	const g = color.g * alpha + 255 * (1 - alpha);
	const b = color.b * alpha + 255 * (1 - alpha);
	// Relative luminance (ITU-R BT.601)
	const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
	return luminance < 128;
}
