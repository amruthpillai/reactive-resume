import type { Style } from "@react-pdf/types";

export const safeTextStyle = {
	minWidth: 0,
	maxWidth: "100%",
	flexShrink: 1,
	overflow: "hidden",
} satisfies Style;
