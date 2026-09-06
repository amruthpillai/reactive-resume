export type BorderPath = {
	color: string;
	bounds: readonly number[];
};

export type BorderGeometry = {
	horizontal: number;
	vertical: number;
};

// The imported-table fixture is explicitly 300pt wide. Row height can change when a cell is edited,
// so use width as stable topology while excluding unrelated paths that inherit the table's stroke color.
const TABLE_GRID_MAX_X = 300;

const isInsideTableWidth = (bounds: readonly number[]) => {
	const [x0, y0, x1, y1] = bounds;
	if (![x0, y0, x1, y1].every((value) => Number.isFinite(value))) return false;
	return Math.min(x0 ?? 0, x1 ?? 0) >= 0 && Math.max(x0 ?? 0, x1 ?? 0) <= TABLE_GRID_MAX_X;
};

export function countTableBorderGeometry(paths: readonly BorderPath[]): BorderGeometry {
	let horizontal = 0;
	let vertical = 0;

	for (const path of paths) {
		if (path.color !== "#cc00cc" || !isInsideTableWidth(path.bounds)) continue;
		const [x0, y0, x1, y1] = path.bounds;
		const width = Math.abs((x1 ?? 0) - (x0 ?? 0));
		const height = Math.abs((y1 ?? 0) - (y0 ?? 0));
		if (height > 0 && height <= 1.01 && width > height) horizontal++;
		if (width > 0 && width <= 1.01 && height > width) vertical++;
	}

	return { horizontal, vertical };
}
