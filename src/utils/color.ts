import type { ColorResult } from "@uiw/color-convert";

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
