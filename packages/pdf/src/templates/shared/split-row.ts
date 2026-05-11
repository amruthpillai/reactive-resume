export const hasSplitRowText = (value: string | undefined): value is string => {
	return typeof value === "string" && value.trim().length > 0;
};

type SplitRowContent = { top: string; bottom: string };

export const promoteSplitRowRight = ({ top, bottom }: SplitRowContent): SplitRowContent => {
	if (hasSplitRowText(top)) return { top, bottom: hasSplitRowText(bottom) ? bottom : "" };

	return { top: hasSplitRowText(bottom) ? bottom : "", bottom: "" };
};
