export const pageDimensionsAsPixels = {
	a4: {
		width: 794,
		height: 1123,
	},
	letter: {
		width: 816,
		height: 1056,
	},
} as const;

export const pageDimensionsAsMillimeters = {
	a4: {
		width: "210mm",
		height: "297mm",
	},
	letter: {
		width: "216mm",
		height: "279mm",
	},
} as const;
