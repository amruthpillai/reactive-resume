import type { Style } from "@react-pdf/types";
import type { TemplatePlacement } from "./styles";

const MIN_SECTION_COLUMNS = 1;
const MAX_SECTION_COLUMNS = 6;

type SectionItemsLayoutInput = {
	columns: unknown;
	rowGap: number;
	columnGap: number;
};

type SectionTimelineInput = {
	sectionTimeline: boolean;
	placement: TemplatePlacement;
	columns: unknown;
};

export type SectionItemsLayout = {
	columns: number;
	containerStyle: Style;
	rowStyle: Style | undefined;
	itemStyle: Style | undefined;
	isGrid: boolean;
};

const normalizeSectionColumns = (columns: unknown): number => {
	if (typeof columns !== "number" || !Number.isFinite(columns) || !Number.isInteger(columns))
		return MIN_SECTION_COLUMNS;

	return Math.min(MAX_SECTION_COLUMNS, Math.max(MIN_SECTION_COLUMNS, columns));
};

export const getSectionItemsLayout = ({ columns, rowGap, columnGap }: SectionItemsLayoutInput): SectionItemsLayout => {
	const normalizedColumns = normalizeSectionColumns(columns);

	if (normalizedColumns === 1) {
		return {
			columns: normalizedColumns,
			containerStyle: { rowGap },
			rowStyle: undefined,
			itemStyle: undefined,
			isGrid: false,
		};
	}

	return {
		columns: normalizedColumns,
		containerStyle: { rowGap },
		rowStyle: {
			flexDirection: "row",
			columnGap,
		},
		itemStyle: {
			flexBasis: 0,
			flexGrow: 1,
			flexShrink: 1,
			minWidth: 0,
			maxWidth: "100%",
			overflow: "hidden",
		},
		isGrid: true,
	};
};

export const getSectionItemRows = <T>(items: T[], columns: unknown): T[][] => {
	const normalizedColumns = normalizeSectionColumns(columns);
	const rows: T[][] = [];

	for (let index = 0; index < items.length; index += normalizedColumns) {
		rows.push(items.slice(index, index + normalizedColumns));
	}

	return rows;
};

export const shouldUseSectionTimeline = ({ sectionTimeline, placement, columns }: SectionTimelineInput): boolean => {
	return sectionTimeline && placement === "main" && normalizeSectionColumns(columns) === 1;
};
