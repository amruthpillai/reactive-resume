import z from "zod";
import {
	awardItemSchema,
	certificationItemSchema,
	coverLetterItemSchema,
	customSectionSchema,
	educationItemSchema,
	experienceItemSchema,
	interestItemSchema,
	languageItemSchema,
	profileItemSchema,
	projectItemSchema,
	publicationItemSchema,
	referenceItemSchema,
	skillItemSchema,
	summaryItemSchema,
	volunteerItemSchema,
} from "@reactive-resume/schema/resume/data";

export const resumeDialogSchemas = [
	z.object({ type: z.literal("resume.create"), data: z.undefined() }),
	z.object({
		type: z.literal("resume.update"),
		data: z.object({ id: z.string(), name: z.string(), slug: z.string(), tags: z.array(z.string()) }),
	}),
	z.object({ type: z.literal("resume.import"), data: z.undefined() }),
	z.object({
		type: z.literal("resume.duplicate"),
		data: z.object({
			id: z.string(),
			name: z.string(),
			slug: z.string(),
			tags: z.array(z.string()),
			shouldRedirect: z.boolean().optional(),
		}),
	}),
	z.object({ type: z.literal("resume.template.gallery"), data: z.undefined() }),
	z.object({
		type: z.literal("resume.sections.profiles.create"),
		data: z.object({ item: profileItemSchema.optional(), customSectionId: z.string().optional() }).optional(),
	}),
	z.object({
		type: z.literal("resume.sections.profiles.update"),
		data: z.object({ item: profileItemSchema, customSectionId: z.string().optional() }),
	}),
	z.object({
		type: z.literal("resume.sections.experience.create"),
		data: z.object({ item: experienceItemSchema.optional(), customSectionId: z.string().optional() }).optional(),
	}),
	z.object({
		type: z.literal("resume.sections.experience.update"),
		data: z.object({ item: experienceItemSchema, customSectionId: z.string().optional() }),
	}),
	z.object({
		type: z.literal("resume.sections.education.create"),
		data: z.object({ item: educationItemSchema.optional(), customSectionId: z.string().optional() }).optional(),
	}),
	z.object({
		type: z.literal("resume.sections.education.update"),
		data: z.object({ item: educationItemSchema, customSectionId: z.string().optional() }),
	}),
	z.object({
		type: z.literal("resume.sections.projects.create"),
		data: z.object({ item: projectItemSchema.optional(), customSectionId: z.string().optional() }).optional(),
	}),
	z.object({
		type: z.literal("resume.sections.projects.update"),
		data: z.object({ item: projectItemSchema, customSectionId: z.string().optional() }),
	}),
	z.object({
		type: z.literal("resume.sections.skills.create"),
		data: z.object({ item: skillItemSchema.optional(), customSectionId: z.string().optional() }).optional(),
	}),
	z.object({
		type: z.literal("resume.sections.skills.update"),
		data: z.object({ item: skillItemSchema, customSectionId: z.string().optional() }),
	}),
	z.object({
		type: z.literal("resume.sections.languages.create"),
		data: z.object({ item: languageItemSchema.optional(), customSectionId: z.string().optional() }).optional(),
	}),
	z.object({
		type: z.literal("resume.sections.languages.update"),
		data: z.object({ item: languageItemSchema, customSectionId: z.string().optional() }),
	}),
	z.object({
		type: z.literal("resume.sections.awards.create"),
		data: z.object({ item: awardItemSchema.optional(), customSectionId: z.string().optional() }).optional(),
	}),
	z.object({
		type: z.literal("resume.sections.awards.update"),
		data: z.object({ item: awardItemSchema, customSectionId: z.string().optional() }),
	}),
	z.object({
		type: z.literal("resume.sections.certifications.create"),
		data: z.object({ item: certificationItemSchema.optional(), customSectionId: z.string().optional() }).optional(),
	}),
	z.object({
		type: z.literal("resume.sections.certifications.update"),
		data: z.object({ item: certificationItemSchema, customSectionId: z.string().optional() }),
	}),
	z.object({
		type: z.literal("resume.sections.publications.create"),
		data: z.object({ item: publicationItemSchema.optional(), customSectionId: z.string().optional() }).optional(),
	}),
	z.object({
		type: z.literal("resume.sections.publications.update"),
		data: z.object({ item: publicationItemSchema, customSectionId: z.string().optional() }),
	}),
	z.object({
		type: z.literal("resume.sections.interests.create"),
		data: z.object({ item: interestItemSchema.optional(), customSectionId: z.string().optional() }).optional(),
	}),
	z.object({
		type: z.literal("resume.sections.interests.update"),
		data: z.object({ item: interestItemSchema, customSectionId: z.string().optional() }),
	}),
	z.object({
		type: z.literal("resume.sections.volunteer.create"),
		data: z.object({ item: volunteerItemSchema.optional(), customSectionId: z.string().optional() }).optional(),
	}),
	z.object({
		type: z.literal("resume.sections.volunteer.update"),
		data: z.object({ item: volunteerItemSchema, customSectionId: z.string().optional() }),
	}),
	z.object({
		type: z.literal("resume.sections.references.create"),
		data: z.object({ item: referenceItemSchema.optional(), customSectionId: z.string().optional() }).optional(),
	}),
	z.object({
		type: z.literal("resume.sections.references.update"),
		data: z.object({ item: referenceItemSchema, customSectionId: z.string().optional() }),
	}),
	z.object({
		type: z.literal("resume.sections.summary.create"),
		data: z.object({ item: summaryItemSchema.optional(), customSectionId: z.string().optional() }).optional(),
	}),
	z.object({
		type: z.literal("resume.sections.summary.update"),
		data: z.object({ item: summaryItemSchema, customSectionId: z.string().optional() }),
	}),
	z.object({
		type: z.literal("resume.sections.cover-letter.create"),
		data: z.object({ item: coverLetterItemSchema.optional(), customSectionId: z.string().optional() }).optional(),
	}),
	z.object({
		type: z.literal("resume.sections.cover-letter.update"),
		data: z.object({ item: coverLetterItemSchema, customSectionId: z.string().optional() }),
	}),
	z.object({ type: z.literal("resume.sections.custom.create"), data: customSectionSchema.optional() }),
	z.object({ type: z.literal("resume.sections.custom.update"), data: customSectionSchema }),
] as const;
