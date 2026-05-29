import z from "zod";
import { resumeDataSchema } from "./data";

export const assistantLanguageSchema = z.enum(["en", "es", "fr", "ar", "pt", "de", "ja", "ko", "zh"]);

export const atsBulletImprovementSchema = z.object({
	original: z.string().min(1),
	improved: z.string().min(1),
	reason: z.string().min(1),
});

export const atsChecklistItemSchema = z.object({
	item: z.string().min(1),
	status: z.enum(["pass", "warning", "fail"]),
	fix: z.string().nullable(),
});

export const atsAnalysisSchema = z.object({
	overallScore: z.number().int().min(0).max(100),
	parseabilityScore: z.number().int().min(0).max(100),
	keywordScore: z.number().int().min(0).max(100),
	impactScore: z.number().int().min(0).max(100),
	recruiterScore: z.number().int().min(0).max(100),
	summary: z.string().min(1),
	formattingFlags: z.array(z.string().min(1)).max(12),
	missingKeywords: z.array(z.string().min(1)).max(30),
	matchedKeywords: z.array(z.string().min(1)).max(30),
	bulletImprovements: z.array(atsBulletImprovementSchema).max(8),
	checklist: z.array(atsChecklistItemSchema).max(12),
});

export const careerGrowthSuggestionSchema = z.object({
	type: z.enum(["skill", "certification", "diploma", "training", "portfolio", "language"]),
	title: z.string().min(1),
	rationale: z.string().min(1),
	priority: z.enum(["high", "medium", "low"]),
	estimatedTime: z.string().nullable(),
	providerName: z.string().nullable(),
	affiliateUrl: z.url().nullable(),
	searchQuery: z.string().min(1),
});

export const careerGrowthPlanSchema = z.object({
	positioningNotes: z.array(z.string().min(1)).max(8),
	suggestions: z.array(careerGrowthSuggestionSchema).max(12),
});

export const careerCoachActionSchema = z.object({
	title: z.string().min(1),
	rationale: z.string().min(1),
	priority: z.enum(["high", "medium", "low"]),
	timeframe: z.string().nullable(),
	successMetric: z.string().nullable(),
	steps: z.array(z.string().min(1)).max(6),
});

export const careerCoachWeekSchema = z.object({
	week: z.string().min(1),
	focus: z.string().min(1),
	tasks: z.array(z.string().min(1)).max(6),
});

export const careerCoachPlanSchema = z.object({
	summary: z.string().min(1),
	positioning: z.string().min(1),
	targetRoles: z.array(z.string().min(1)).max(8),
	strengthsToLeverage: z.array(z.string().min(1)).max(8),
	gaps: z.array(z.string().min(1)).max(8),
	actions: z.array(careerCoachActionSchema).max(10),
	resumeStrategy: z.array(z.string().min(1)).max(8),
	linkedinStrategy: z.array(z.string().min(1)).max(8),
	networkingPlan: z.array(z.string().min(1)).max(8),
	interviewPrep: z.array(z.string().min(1)).max(8),
	salaryStrategy: z.array(z.string().min(1)).max(8),
	weeklyPlan: z.array(careerCoachWeekSchema).max(8),
	cautions: z.array(z.string().min(1)).max(6),
	language: assistantLanguageSchema,
});

export const salaryRangeSchema = z.object({
	min: z.number().nonnegative(),
	max: z.number().nonnegative(),
	currency: z.string().min(1).max(8),
});

export const salaryScriptSchema = z.object({
	scenario: z.string().min(1),
	message: z.string().min(1),
});

export const salaryNegotiationSchema = z.object({
	marketPositioning: z.string().min(1),
	leveragePoints: z.array(z.string().min(1)).max(8),
	risks: z.array(z.string().min(1)).max(8),
	suggestedRange: salaryRangeSchema.nullable(),
	scripts: z.array(salaryScriptSchema).max(6),
	emailTemplate: z.string().min(1),
	language: assistantLanguageSchema,
});

export const linkedinExperienceRewriteSchema = z.object({
	role: z.string().min(1),
	company: z.string().nullable(),
	rewrite: z.string().min(1),
});

export const linkedinProfileSchema = z.object({
	headline: z.string().min(1),
	about: z.string().min(1),
	experienceRewrites: z.array(linkedinExperienceRewriteSchema).max(8),
	featuredSuggestions: z.array(z.string().min(1)).max(8),
	skills: z.array(z.string().min(1)).max(30),
	connectionNote: z.string().min(1),
	recruiterMessage: z.string().min(1),
	language: assistantLanguageSchema,
});

export const jobScamRedFlagSchema = z.object({
	title: z.string().min(1),
	evidence: z.string().min(1),
	severity: z.enum(["low", "medium", "high"]),
	candidateAction: z.string().min(1),
});

export const jobScamAnalysisSchema = z.object({
	riskScore: z.number().int().min(0).max(100),
	riskLevel: z.enum(["low", "medium", "high", "critical"]),
	summary: z.string().min(1),
	redFlags: z.array(jobScamRedFlagSchema).max(12),
	reassuringSignals: z.array(z.string().min(1)).max(8),
	verificationQuestions: z.array(z.string().min(1)).max(8),
	safeNextSteps: z.array(z.string().min(1)).max(8),
	avoidUntilVerified: z.array(z.string().min(1)).max(8),
	language: assistantLanguageSchema,
});

export const resumeWizardDraftSchema = z.object({
	resumeName: z.string().min(1).max(64),
	resumeData: resumeDataSchema,
	ats: atsAnalysisSchema,
	growth: careerGrowthPlanSchema,
	salaryNegotiation: salaryNegotiationSchema.nullable(),
	linkedinProfile: linkedinProfileSchema.nullable(),
	notes: z.array(z.string().min(1)).max(8),
});

export type AssistantLanguage = z.infer<typeof assistantLanguageSchema>;
export type AtsAnalysis = z.infer<typeof atsAnalysisSchema>;
export type CareerCoachPlan = z.infer<typeof careerCoachPlanSchema>;
export type CareerGrowthPlan = z.infer<typeof careerGrowthPlanSchema>;
export type JobScamAnalysis = z.infer<typeof jobScamAnalysisSchema>;
export type LinkedInProfile = z.infer<typeof linkedinProfileSchema>;
export type SalaryNegotiation = z.infer<typeof salaryNegotiationSchema>;
export type ResumeWizardDraft = z.infer<typeof resumeWizardDraftSchema>;
