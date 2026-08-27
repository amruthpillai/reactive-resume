/**
 * PDF.js operator numbers, hardcoded so this package stays free of a pdf.js dependency.
 *
 * These are stable across pdf.js releases in practice, but "in practice" is not a guarantee:
 * `packages/pdf/src/ats-extraction.integration.test.tsx` asserts every number here against the
 * real `OPS` export, so a renumbering fails a test rather than silently mis-reading a file.
 *
 * Note the gaps at 78, 79 and 82 — those numbers are unused in current builds. Nothing here
 * may assume the sequence is dense.
 */
export const PDF_OPS = {
	setLineWidth: 2,
	save: 10,
	restore: 11,
	transform: 12,
	closePath: 18,
	rectangle: 19,
	stroke: 20,
	closeStroke: 21,
	fill: 22,
	eoFill: 23,
	fillStroke: 24,
	eoFillStroke: 25,
	closeFillStroke: 26,
	closeEOFillStroke: 27,
	endPath: 28,
	beginText: 31,
	endText: 32,
	setFont: 37,
	setTextRenderingMode: 38,
	setTextMatrix: 42,
	showText: 44,
	showSpacedText: 45,
	nextLineShowText: 46,
	nextLineSetSpacingShowText: 47,
	setFillColorSpace: 51,
	setFillColorN: 55,
	setFillGray: 57,
	setFillRGBColor: 59,
	setFillCMYKColor: 61,
	shadingFill: 62,
	paintFormXObjectBegin: 74,
	paintFormXObjectEnd: 75,
	beginGroup: 76,
	endGroup: 77,
	paintImageMaskXObject: 83,
	paintImageMaskXObjectGroup: 84,
	paintImageXObject: 85,
	paintInlineImageXObject: 86,
	paintInlineImageXObjectGroup: 87,
	paintImageXObjectRepeat: 88,
	paintImageMaskXObjectRepeat: 89,
	paintSolidColorImageMask: 90,
	constructPath: 91,
	setFillTransparent: 93,
	rawFillPath: 94,
} as const;

/** Every operator that puts pixels on the page from raster data, masks included. */
export const IMAGE_PAINT_OPS: ReadonlySet<number> = new Set([
	PDF_OPS.paintImageMaskXObject,
	PDF_OPS.paintImageMaskXObjectGroup,
	PDF_OPS.paintImageXObject,
	PDF_OPS.paintInlineImageXObject,
	PDF_OPS.paintInlineImageXObjectGroup,
	PDF_OPS.paintImageXObjectRepeat,
	PDF_OPS.paintImageMaskXObjectRepeat,
	PDF_OPS.paintSolidColorImageMask,
]);

/** Repeat and group variants carry per-instance matrices rather than drawing once. */
export const REPEATED_IMAGE_OPS: ReadonlySet<number> = new Set([
	PDF_OPS.paintImageXObjectRepeat,
	PDF_OPS.paintImageMaskXObjectRepeat,
	PDF_OPS.paintImageMaskXObjectGroup,
]);

export const TEXT_SHOW_OPS: ReadonlySet<number> = new Set([
	PDF_OPS.showText,
	PDF_OPS.showSpacedText,
	PDF_OPS.nextLineShowText,
	PDF_OPS.nextLineSetSpacingShowText,
]);

export const PATH_PAINT_OPS: ReadonlySet<number> = new Set([
	PDF_OPS.stroke,
	PDF_OPS.closeStroke,
	PDF_OPS.fill,
	PDF_OPS.eoFill,
	PDF_OPS.fillStroke,
	PDF_OPS.eoFillStroke,
	PDF_OPS.closeFillStroke,
	PDF_OPS.closeEOFillStroke,
	PDF_OPS.constructPath,
	PDF_OPS.rawFillPath,
	PDF_OPS.shadingFill,
]);

/** PDF text rendering modes that paint nothing a reader can see. */
export const INVISIBLE_TEXT_RENDER_MODES: ReadonlySet<number> = new Set([3, 7]);
