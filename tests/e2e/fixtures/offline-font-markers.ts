export type PdfTextItem = {
	str: string;
	x: number;
	y: number;
	width: number;
	height: number;
};

export type PdfMarker = {
	name: string;
	marker: string;
};

type PdfMarkerBox = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export type PdfMarkerLocation<TMarker extends PdfMarker = PdfMarker> = TMarker & {
	box: PdfMarkerBox | null;
};

export type RasterInkMeasurements = {
	inkPixels: number;
	interiorInk: number;
	trimmedWidth: number;
	trimmedHeight: number;
};

export type RasterGlyphStatus = "visible" | "blank" | "tofu-like";

export type RasterGlyphMeasurement<TName extends string = string> = RasterInkMeasurements & {
	name: TName;
	located: boolean;
};

export type RasterGlyphEvidence<TName extends string = string> = Omit<RasterInkMeasurements, "interiorInk"> & {
	name: TName;
	status: RasterGlyphStatus | "not-located";
};

type TextItemRange = PdfTextItem & {
	start: number;
	end: number;
};

const textItemRanges = (textItems: PdfTextItem[]): TextItemRange[] => {
	let offset = 0;
	return textItems.map((item) => {
		const start = offset;
		offset += item.str.length;
		return { ...item, start, end: offset };
	});
};

const findMarkerOccurrences = (text: string, marker: string): number[] => {
	if (marker.length === 0) return [];

	const occurrences: number[] = [];
	let start = 0;
	while (start <= text.length - marker.length) {
		const match = text.indexOf(marker, start);
		if (match === -1) break;
		occurrences.push(match);
		start = match + marker.length;
	}
	return occurrences;
};

export const locatePdfMarkerBoxes = <TMarker extends PdfMarker>(
	textItems: PdfTextItem[],
	markers: readonly TMarker[],
	pageHeight: number,
): PdfMarkerLocation<TMarker>[] => {
	const ranges = textItemRanges(textItems);
	const text = textItems.map((item) => item.str).join("");

	return markers.map((marker) => {
		const [start] = findMarkerOccurrences(text, marker.marker);
		const end = start === undefined ? undefined : start + marker.marker.length;
		if (start === undefined || end === undefined || findMarkerOccurrences(text, marker.marker).length !== 1) {
			return { ...marker, box: null };
		}

		const coveredRanges = ranges.filter((range) => range.start < end && range.end > start);
		const firstRange = coveredRanges[0];
		const lastRange = coveredRanges.at(-1);
		if (!firstRange || !lastRange) return { ...marker, box: null };

		const firstLocalStart = start - firstRange.start;
		const lastLocalEnd = end - lastRange.start;
		const leadingText = firstRange.str.slice(0, firstLocalStart);
		const trailingText = lastRange.str.slice(lastLocalEnd);
		if (leadingText.trim() || trailingText.trim()) return { ...marker, box: null };

		const left = Math.min(...coveredRanges.map((range) => range.x));
		const top = Math.min(...coveredRanges.map((range) => pageHeight - range.y - Math.max(range.height, 1)));
		const right = Math.max(...coveredRanges.map((range) => range.x + Math.max(range.width, 1)));
		const bottom = Math.max(...coveredRanges.map((range) => pageHeight - range.y));

		return {
			...marker,
			box: {
				x: left,
				y: top,
				width: Math.max(right - left, 1),
				height: Math.max(bottom - top, 1),
			},
		};
	});
};

export const classifyRasterInk = ({
	inkPixels,
	interiorInk,
	trimmedWidth,
	trimmedHeight,
}: RasterInkMeasurements): RasterGlyphStatus => {
	if (inkPixels === 0) return "blank";
	const interiorRatio = interiorInk / Math.max(inkPixels, 1);
	return interiorRatio < 0.08 && trimmedWidth >= 8 && trimmedHeight >= 8 ? "tofu-like" : "visible";
};

export const classifyRasterMeasurements = <TName extends string>(
	measurements: readonly RasterGlyphMeasurement<TName>[],
): RasterGlyphEvidence<TName>[] =>
	measurements.map(({ name, located, interiorInk, ...measurements }) => ({
		...measurements,
		name,
		status: located ? classifyRasterInk({ ...measurements, interiorInk }) : "not-located",
	}));
