import z from "zod";

export const analysisDimensionSchema = z.object({
  dimension: z.string().min(1),
  score: z.number().int().min(0).max(100),
  rationale: z.string().min(1),
});

export const analysisSuggestionSchema = z.object({
  title: z.string().min(1),
  impact: z.enum(["high", "medium", "low"]),
  why: z.string().min(1),
  exampleRewrite: z.string().nullable(),
  copyPrompt: z.string().min(1),
});

export const resumeAnalysisSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  scorecard: z.array(analysisDimensionSchema).min(1),
  suggestions: z.array(analysisSuggestionSchema).max(10),
  strengths: z.array(z.string().min(1)).max(10),
});

export const storedResumeAnalysisSchema = resumeAnalysisSchema.extend({
  updatedAt: z.coerce.date(),
  modelMeta: z.object({
    provider: z.string().min(1),
    model: z.string().min(1),
  }),
});

export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;
export type StoredResumeAnalysis = z.infer<typeof storedResumeAnalysisSchema>;
