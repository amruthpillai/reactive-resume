export type ExpectedToken = {
	value: string;
	group: string;
};

export type EvaluationCorpus = {
	name: string;
	tokens: readonly ExpectedToken[];
	links?: readonly string[];
};

export type ExtractedExport = {
	/** Paragraphs/lines in the extractor's returned order. */
	paragraphs: readonly string[];
	links: readonly string[];
};

export type ExportMetrics = {
	recall: { numerator: number; denominator: number; value: number };
	order: { numerator: number; denominator: number; value: number };
	duplicates: { expected: number; observed: number; extra: number };
	grouping: { numerator: number; denominator: number; value: number };
	links: {
		expected: readonly string[];
		observed: readonly string[];
		missing: readonly string[];
		unexpected: readonly string[];
	};
	missingTokens: readonly string[];
	outOfOrderPairs: readonly (readonly [string, string])[];
	observedTokens: number;
};

/**
 * Tokenization used by this evaluation only. It is deliberately transparent and locale-neutral:
 * Unicode letters/numbers stay intact, punctuation is a separator, and matching is case-folded.
 * This is a corpus metric, not a claim about any vendor parser.
 */
export function tokenize(value: string): string[] {
	return (
		value
			.normalize("NFC")
			.match(/[\p{L}\p{N}]+/gu)
			?.map((token) => token.toLocaleLowerCase("en-US")) ?? []
	);
}

const metric = (numerator: number, denominator: number) => ({
	numerator,
	denominator,
	value: denominator === 0 ? 1 : numerator / denominator,
});

function normalizeLinkTarget(target: string): string {
	const trimmed = target.trim();
	try {
		const url = new URL(trimmed);
		url.protocol = url.protocol.toLowerCase();
		url.hostname = url.hostname.toLowerCase();
		if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
		return url.toString();
	} catch {
		return trimmed;
	}
}

function normalizeLinks(links: readonly string[]): string[] {
	return [...new Set(links.map(normalizeLinkTarget))];
}

/**
 * Computes raw extraction measurements from corpus tokens and extractor paragraphs.
 *
 * Recall uses distinct expected tokens. Duplicate accounting separately reports all matching
 * occurrences, so dropping a token cannot be hidden by duplicate output. Order and grouping use
 * the first occurrence of each distinct expected token, keeping recall/order measures interpretable
 * when an export repeats a heading or bullet. Grouping retains every expected token occurrence so
 * repeated values keep their authored field group and occurrence identity.
 */
export function evaluateExport(corpus: EvaluationCorpus, extracted: ExtractedExport): ExportMetrics {
	const expected = corpus.tokens.flatMap((entry) =>
		tokenize(entry.value).map((value) => ({ value, group: entry.group })),
	);
	const expectedOccurrenceOrdinals: number[] = [];
	const expectedValues: string[] = [];
	const expectedValuesSet = new Set<string>();
	const expectedCounts = new Map<string, number>();
	for (const token of expected) {
		const ordinal = expectedCounts.get(token.value) ?? 0;
		expectedOccurrenceOrdinals.push(ordinal);
		expectedCounts.set(token.value, ordinal + 1);
		if (!expectedValuesSet.has(token.value)) {
			expectedValuesSet.add(token.value);
			expectedValues.push(token.value);
		}
	}

	const observedByParagraph = extracted.paragraphs.map(tokenize);
	const observed = observedByParagraph.flat();
	const observedPositions = new Map<string, number>();
	const observedPositionsByValue = new Map<string, number[]>();
	for (const [index, token] of observed.entries()) {
		if (!observedPositions.has(token)) observedPositions.set(token, index);
		const positions = observedPositionsByValue.get(token) ?? [];
		positions.push(index);
		observedPositionsByValue.set(token, positions);
	}

	const recoveredDistinct = expectedValues.filter((value) => observedPositions.has(value)).length;
	const expectedTokenPairs = expectedValues.flatMap((value, index) => {
		const next = expectedValues[index + 1];
		return next ? ([[value, next]] as const) : [];
	});
	const outOfOrderPairs = expectedTokenPairs.filter(([left, right]) => {
		const leftPosition = observedPositions.get(left);
		const rightPosition = observedPositions.get(right);
		return leftPosition === undefined || rightPosition === undefined || leftPosition >= rightPosition;
	});

	const observedParagraphPositionsByValue = new Map<string, number[]>();
	for (const [paragraphIndex, paragraphTokens] of observedByParagraph.entries()) {
		for (const token of paragraphTokens) {
			const positions = observedParagraphPositionsByValue.get(token) ?? [];
			positions.push(paragraphIndex);
			observedParagraphPositionsByValue.set(token, positions);
		}
	}
	const eligibleExpectedPairs = expected.flatMap((token, index) => {
		const next = expected[index + 1];
		return next && token.group === next.group ? [[index, index + 1] as const] : [];
	});
	const groupedPairs = eligibleExpectedPairs.filter(([leftIndex, rightIndex]) => {
		const left = expected[leftIndex];
		const right = expected[rightIndex];
		if (!left || !right) return false;
		const leftPosition = observedPositionsByValue.get(left.value)?.[expectedOccurrenceOrdinals[leftIndex] ?? 0];
		const rightPosition = observedPositionsByValue.get(right.value)?.[expectedOccurrenceOrdinals[rightIndex] ?? 0];
		const leftParagraph = observedParagraphPositionsByValue.get(left.value)?.[
			expectedOccurrenceOrdinals[leftIndex] ?? 0
		];
		const rightParagraph = observedParagraphPositionsByValue.get(right.value)?.[
			expectedOccurrenceOrdinals[rightIndex] ?? 0
		];
		if (leftPosition === undefined || rightPosition === undefined) return false;
		return leftParagraph !== undefined && rightParagraph !== undefined && leftParagraph === rightParagraph;
	}).length;

	const observedExpectedOccurrences = observed.filter((token) => expectedValuesSet.has(token)).length;
	const expectedLinks = normalizeLinks(corpus.links ?? []);
	const observedLinks = normalizeLinks(extracted.links);
	const observedLinksSet = new Set(observedLinks);
	const expectedLinksSet = new Set(expectedLinks);

	return {
		recall: metric(recoveredDistinct, expectedValues.length),
		order: metric(expectedTokenPairs.length - outOfOrderPairs.length, expectedTokenPairs.length),
		duplicates: {
			expected: expected.length,
			observed: observedExpectedOccurrences,
			extra: Math.max(0, observedExpectedOccurrences - expected.length),
		},
		grouping: metric(groupedPairs, eligibleExpectedPairs.length),
		links: {
			expected: expectedLinks,
			observed: observedLinks,
			missing: expectedLinks.filter((link) => !observedLinksSet.has(link)),
			unexpected: observedLinks.filter((link) => !expectedLinksSet.has(link)),
		},
		missingTokens: expectedValues.filter((value) => !observedPositions.has(value)),
		outOfOrderPairs,
		observedTokens: observed.length,
	};
}
