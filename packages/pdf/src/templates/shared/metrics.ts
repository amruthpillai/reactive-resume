import type { ResumeData } from "@reactive-resume/schema/resume/data";

type PageMetricsInput = Pick<ResumeData["metadata"]["page"], "gapX" | "gapY" | "marginX" | "marginY">;

export type TemplateMetrics = {
	page: {
		paddingHorizontal: number;
		paddingVertical: number;
	};
	headerGap: number;
	columnGap: number;
	sectionGap: number;
	itemGapX: number;
	itemGapY: number;
	gapX: (factor: number) => number;
	gapY: (factor: number) => number;
};

export const getTemplateMetrics = ({ gapX, gapY, marginX, marginY }: PageMetricsInput): TemplateMetrics => ({
	page: {
		paddingHorizontal: marginX,
		paddingVertical: marginY,
	},
	headerGap: marginY,
	columnGap: marginX,
	sectionGap: marginY,
	itemGapX: gapX,
	itemGapY: gapY,
	gapX: (factor) => gapX * factor,
	gapY: (factor) => gapY * factor,
});
