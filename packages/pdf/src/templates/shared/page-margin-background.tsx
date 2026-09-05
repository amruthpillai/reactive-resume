import { View } from "#react-pdf-renderer";

type PageMarginBackgroundProps = {
	color: string;
	margin: number;
};

/**
 * Page padding repeats on overflow pages; the negative top margin on each column
 * preserves its first-page position and is reset by React PDF when the column splits.
 * Extend only its paint through those margins, without painting translucent content twice.
 */
export const PageMarginBackground = ({ color, margin }: PageMarginBackgroundProps) => (
	<>
		<View
			fixed
			style={{ position: "absolute", top: -margin, height: margin, left: 0, right: 0, backgroundColor: color }}
		/>
		<View
			fixed
			style={{ position: "absolute", bottom: -margin, height: margin, left: 0, right: 0, backgroundColor: color }}
		/>
	</>
);
