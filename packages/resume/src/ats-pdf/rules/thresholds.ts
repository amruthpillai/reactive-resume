/**
 * Every number the checks fire on, in one place.
 *
 * Keeping them here is what makes the engine arguable: a threshold that turns out to be wrong is
 * a one-line change with a test beside it, not a hunt through eight rule modules.
 */
export const THRESHOLDS = {
	file: {
		/** Common upper bound on application-portal uploads. */
		maxBytes: 2_500_000,
		largeBytes: 1_000_000,
	},

	text: {
		/** Below this many characters across the whole file, there is effectively no text layer. */
		minCharacters: 40,
		/** Below this many words, the document is too thin to have extracted properly. */
		shortDocumentWords: 150,
		lowDensityWordsPerPage: 90,
	},

	quality: {
		replacementRatio: 0.02,
		privateUseRatio: 0.02,
		ligatureCount: 3,
		/** Only consulted once the text is known to be English. */
		garbledLexiconRatio: 0.25,
		garbledVowellessRatio: 0.25,
		runOnTokenRatio: 0.03,
		singleCharItemRatio: 0.5,
		minItemsForSpacingSignal: 50,
	},

	images: {
		/** Page coverage at which words inside the artwork stop being reachable as text. */
		highCoverageRatio: 0.5,
		/** An image-only page: near-total coverage with almost nothing selectable behind it. */
		scanCoverageRatio: 0.6,
		scanMaxCharsPerPage: 120,
		scanPageShare: 0.5,
	},

	layout: {
		/** A gutter has to stay clear down almost the whole text column to count as one. */
		gutterCoverage: 0.85,
		gutterSevereCoverage: 0.9,
		/** Both sides must carry real content: a wide margin with a stub in it is not a column. */
		gutterSplitRatio: 0.25,
		gutterPageShare: 0.5,
		inversionRatio: 0.25,
		inversionSevereRatio: 0.45,
		minLinesForInversion: 15,
		tableLineShare: 0.2,
		minTableLines: 6,
		/** Gap between spans, as a multiple of font size, that reads as a column break within a line. */
		tableGapRatio: 2.5,
		minTableColumns: 3,
		/** Matches the builder's own live lint, so the two engines never contradict each other. */
		marginPoints: 8,
		marginZonePoints: 18,
		outsidePageTolerance: 1,
		minBodyFontSize: 9,
		lineSpacingRatio: 1.05,
		maxDistinctFonts: 6,
		densePageTextRatio: 0.55,
	},

	pages: {
		/** Analysed page ceiling; anything past this is reported as not covered. */
		maxAnalyzed: 30,
		highPageCount: 3,
		/** Page dimension tolerance, in points, when matching A4 / Letter / Legal. */
		sizeTolerance: 6,
	},

	sections: {
		minRecognizedHeadings: 2,
		distinguishedHeadingShare: 0.5,
	},

	dates: {
		/** Fewer parsed ranges than this on a full-length resume means entries are missing periods. */
		minRanges: 2,
		minShapeOccurrences: 2,
		minMixedShapes: 2,
	},

	content: {
		quantifiedBulletShare: 0.2,
		actionVerbBulletShare: 0.5,
		minBulletsForContentAdvice: 4,
		maxFirstPersonMentions: 2,
		allCapsLineCount: 4,
	},
} as const;

/** Page sizes that survive re-rendering everywhere, in points. */
export const STANDARD_PAGE_SIZES: readonly { name: string; width: number; height: number }[] = [
	{ name: "A4", width: 595.28, height: 841.89 },
	{ name: "Letter", width: 612, height: 792 },
	{ name: "Legal", width: 612, height: 1008 },
];
