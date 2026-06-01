export type ResolveLevelDisplaySizesOptions = {
	bodyFontSize: number;
	iconFontSize?: number | undefined;
	levelFontSize?: number | undefined;
};

export type LevelDisplaySizes = {
	decorationSize: number;
	levelIconExplicitSize?: number | undefined;
};

export const resolveLevelDisplaySizes = (options: ResolveLevelDisplaySizesOptions): LevelDisplaySizes => {
	const defaultDecorationSize = options.bodyFontSize - 2;
	const legacyLevelIconSize = defaultDecorationSize + 4;

	const decorationSize = options.levelFontSize ?? options.iconFontSize ?? defaultDecorationSize;

	if (options.levelFontSize !== undefined) {
		return { decorationSize, levelIconExplicitSize: options.levelFontSize };
	}

	if (options.iconFontSize !== undefined) {
		return { decorationSize };
	}

	return { decorationSize, levelIconExplicitSize: legacyLevelIconSize };
};
