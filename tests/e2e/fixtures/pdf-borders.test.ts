import type { BorderPath } from "./pdf-borders";
import { describe, expect, it } from "vitest";
import { countTableBorderGeometry } from "./pdf-borders";

describe("table border geometry", () => {
	it("does not count a later path after stale magenta stroke state", () => {
		const paths: BorderPath[] = [
			{ color: "#cc00cc", bounds: [0, 0, 100, 1] },
			{ color: "#cc00cc", bounds: [0, 19.65, 358.93, 20.65] },
		];
		const oldHorizontal = paths.filter(({ color, bounds: [x0, y0, x1, y1] }) => {
			const width = Math.abs((x1 ?? 0) - (x0 ?? 0));
			const height = Math.abs((y1 ?? 0) - (y0 ?? 0));
			return color === "#cc00cc" && height > 0 && height <= 1.01 && width > height;
		}).length;

		expect(oldHorizontal).toBe(2);
		expect(countTableBorderGeometry(paths)).toEqual({ horizontal: 1, vertical: 0 });
	});
});
