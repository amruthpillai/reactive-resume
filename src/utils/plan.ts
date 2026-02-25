import z from "zod";

export const planSchema = z.enum(["free", "pro"]);

export type Plan = z.infer<typeof planSchema>;

export const PLAN_LIMITS = {
	free: {
		maxResumes: 1,
		maxPdfDownloadsPerMonth: 2,
		maxAiSuggestionsPerMonth: 5,
		watermarkPdf: true,
		premiumTemplates: false,
		customPublicUrl: false,
	},
	pro: {
		maxResumes: Infinity,
		maxPdfDownloadsPerMonth: Infinity,
		maxAiSuggestionsPerMonth: Infinity,
		watermarkPdf: false,
		premiumTemplates: true,
		customPublicUrl: true,
	},
} as const satisfies Record<Plan, PlanLimits>;

export type PlanLimits = {
	maxResumes: number;
	maxPdfDownloadsPerMonth: number;
	maxAiSuggestionsPerMonth: number;
	watermarkPdf: boolean;
	premiumTemplates: boolean;
	customPublicUrl: boolean;
};

export function getPlanLimits(plan: Plan): PlanLimits {
	return PLAN_LIMITS[plan];
}

export function getCurrentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
