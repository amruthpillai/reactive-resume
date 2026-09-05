import z from "zod";
import {
	coverLetterContentSchema,
	coverLetterDocumentSchema,
	coverLetterSchema,
} from "@reactive-resume/schema/cover-letter/data";

const idSchema = z.object({ id: z.string().min(1) });
const revisionSchema = idSchema.extend({ expectedRevision: z.number().int().min(1) });
const editableSchema = coverLetterContentSchema.pick({ name: true, recipient: true, content: true });

export const coverLetterDto = {
	list: {
		input: z
			.object({
				search: z.string().max(100).optional(),
				resumeId: z.string().min(1).optional(),
				applicationId: z.string().min(1).optional(),
				limit: z.number().int().min(1).max(100).default(20),
				offset: z.number().int().min(0).default(0),
			})
			.default({ limit: 20, offset: 0 }),
		output: z.object({ items: z.array(coverLetterSchema), total: z.number() }),
	},
	getById: { input: idSchema, output: coverLetterSchema },
	create: {
		input: editableSchema.extend({
			recipient: editableSchema.shape.recipient.default(""),
			content: editableSchema.shape.content.default(""),
			resumeId: z.string().min(1).optional(),
			applicationId: z.string().min(1).optional(),
		}),
		output: coverLetterSchema,
	},
	update: { input: revisionSchema.extend(editableSchema.partial().shape), output: coverLetterSchema },
	refreshStyle: { input: revisionSchema.extend({ resumeId: z.string().min(1) }), output: coverLetterSchema },
	duplicate: { input: idSchema.extend({ name: editableSchema.shape.name.optional() }), output: coverLetterSchema },
	delete: { input: revisionSchema, output: z.void() },
	copyEmbedded: {
		input: z.object({
			resumeId: z.string().min(1),
			sectionId: z.string().min(1),
			itemId: z.string().min(1),
			name: editableSchema.shape.name.optional(),
		}),
		output: coverLetterSchema,
	},
	export: { input: idSchema, output: coverLetterDocumentSchema },
	import: { input: z.object({ document: coverLetterDocumentSchema }), output: coverLetterSchema },
};

export type CoverLetterListInput = z.infer<typeof coverLetterDto.list.input>;
export type CoverLetterCreateInput = z.infer<typeof coverLetterDto.create.input>;
export type CoverLetterUpdateInput = z.infer<typeof coverLetterDto.update.input>;
