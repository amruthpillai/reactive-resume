import z from "zod";

export const fontDeclarationSchema = z.object({
	family: z.string().min(1),
	weights: z.array(z.number().int().positive()),
	source: z.enum(["bundled", "google"]),
	files: z.record(z.string(), z.string()).optional(),
});

export type FontDeclaration = z.infer<typeof fontDeclarationSchema>;

export const typographySlotSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	defaultFont: z.string().optional(),
	defaultSize: z.number().positive().optional(),
	defaultWeight: z.number().int().positive().optional(),
	defaultLineHeight: z.number().positive().optional(),
});

export type TypographySlot = z.infer<typeof typographySlotSchema>;

export const templateMetadataSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	author: z.string().optional(),
	description: z.string().optional(),
	sidebarPosition: z.enum(["left", "right", "none", "either"]),
	tags: z.array(z.string()).catch([]),
	fonts: z.array(fontDeclarationSchema).catch([]),
	typography: z.array(typographySlotSchema).catch([]),
});

export type TemplateMetadata = z.infer<typeof templateMetadataSchema>;

export const resumeSlotInputTypeSchema = z.enum(["rich-text", "text", "image", "image-list", "url", "toggle"]);

export type ResumeSlotInputType = z.infer<typeof resumeSlotInputTypeSchema>;

export const resumeSlotItemTypeSchema = z.enum([
	"experienceItem",
	"educationItem",
	"projectItem",
	"skillItem",
	"certificationItem",
	"awardItem",
	"publicationItem",
	"volunteerItem",
	"referenceItem",
	"languageItem",
	"interestItem",
]);

export type ResumeSlotItemType = z.infer<typeof resumeSlotItemTypeSchema>;

export const resumeSlotSchema = z.object({
	id: z.string().min(1),
	itemType: resumeSlotItemTypeSchema,
	type: resumeSlotInputTypeSchema,
	label: z.string().min(1),
	description: z.string().optional(),
	required: z.boolean().catch(false),
});

export type ResumeSlot = z.infer<typeof resumeSlotSchema>;

export const parsedTemplateSchema = z.object({
	metadata: templateMetadataSchema,
	inputs: z.array(resumeSlotSchema),
	files: z.record(z.string(), z.string()).catch({}),
});

export type ParsedTemplate = z.infer<typeof parsedTemplateSchema> & {
	warnings: Array<{ type: string; message: string }>;
};
