import z from "zod";
import { basicsSchema, metadataSchema, pictureSchema } from "../resume/data";

export const coverLetterStyleSchema = z.object({
	basics: basicsSchema,
	picture: pictureSchema,
	metadata: metadataSchema.omit({ notes: true, layout: true }),
	sectionId: z.string().min(1),
	itemId: z.string().min(1),
});

export const coverLetterContentSchema = z.object({
	name: z.string().trim().min(1).max(100),
	recipient: z.string().max(20_000),
	content: z.string().max(100_000),
	style: coverLetterStyleSchema,
});

export const coverLetterSchema = coverLetterContentSchema.extend({
	id: z.string(),
	sourceResumeId: z.string().nullable(),
	sourceApplicationId: z.string().nullable(),
	revision: z.number().int().min(1),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const coverLetterDocumentSchema = coverLetterContentSchema.extend({
	format: z.literal("reactive-resume-cover-letter"),
	version: z.literal(1),
});

export type CoverLetterStyle = z.infer<typeof coverLetterStyleSchema>;
export type CoverLetter = z.infer<typeof coverLetterSchema>;
export type CoverLetterDocument = z.infer<typeof coverLetterDocumentSchema>;
