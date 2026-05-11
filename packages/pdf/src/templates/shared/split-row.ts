type SplitRowRightContent = {
	topRight: string;
	bottomRight: string;
};

export const hasSplitRowText = (value: string | undefined): value is string => {
	return typeof value === "string" && value.trim().length > 0;
};

export const promoteBottomRightWhenTopRightMissing = ({
	topRight,
	bottomRight,
}: SplitRowRightContent): SplitRowRightContent => {
	if (hasSplitRowText(topRight)) return { topRight, bottomRight: hasSplitRowText(bottomRight) ? bottomRight : "" };

	return {
		topRight: hasSplitRowText(bottomRight) ? bottomRight : "",
		bottomRight: "",
	};
};
