import z from "zod";

// Pipeline stages are a fixed enum for v1. If per-user custom stages are ever needed,
// promote this to a table. `rejected` is a terminal stage; `archived` (a boolean on the
// row) hides an application from the board without deleting it.
export const applicationStatusSchema = z.enum(["saved", "applied", "screening", "interview", "offer", "rejected"]);

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

// Ordered stage metadata shared by the API (validation) and the web board (columns/colors).
export const STAGES = [
	{ value: "saved", label: "Saved", color: "oklch(0.62 0 0)" },
	{ value: "applied", label: "Applied", color: "oklch(0.52 0.19 285)" },
	{ value: "screening", label: "Screening", color: "oklch(0.45 0.08 195)" },
	{ value: "interview", label: "Interview", color: "oklch(0.5 0.1 70)" },
	{ value: "offer", label: "Offer", color: "oklch(0.55 0.15 152)" },
	{ value: "rejected", label: "Rejected", color: "oklch(0.63 0.12 22)" },
] as const satisfies ReadonlyArray<{ value: ApplicationStatus; label: string; color: string }>;

export const contactSchema = z.object({
	name: z.string().trim().min(1),
	role: z.string().trim().default(""),
	// Free-form label shown as a pill: "Recruiter", "Referral", "Hiring Manager"…
	type: z.string().trim().default(""),
});

export type Contact = z.infer<typeof contactSchema>;

const timelineBaseSchema = z.object({
	id: z.string().min(1),
	at: z.coerce.date(),
});

export const applicationTimelineEntrySchema = z.discriminatedUnion("type", [
	timelineBaseSchema.extend({
		type: z.literal("stage"),
		stage: applicationStatusSchema,
	}),
	timelineBaseSchema.extend({
		type: z.literal("note"),
		text: z.string().trim().min(1),
	}),
]);

export type ApplicationTimelineEntry = z.infer<typeof applicationTimelineEntrySchema>;
export type ActivityEvent = ApplicationTimelineEntry;

// Reserved for AI enrichment output (autofill / match-score). Free-form so the shape can
// evolve without a migration. See the AI roadmap in the applications feature.
export const aiMetadataSchema = z.record(z.string(), z.unknown());

export type AiMetadata = z.infer<typeof aiMetadataSchema>;
