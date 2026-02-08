import { createSelectSchema } from "drizzle-zod";
import z from "zod";
import { schema } from "@/integrations/drizzle";
import { resumeDataSchema } from "@/schema/resume/data";
import { jsonPatchOperationSchema } from "@/utils/resume/patch";

const resumeSchema = createSelectSchema(schema.resume, {
	id: z.string().describe("The ID of the resume."),
	name: z.string().min(1).max(64).describe("The name of the resume."),
	slug: z.string().min(1).max(64).describe("The slug of the resume."),
	tags: z.array(z.string()).describe("The tags of the resume."),
	isPublic: z.boolean().describe("Whether the resume is public."),
	isLocked: z.boolean().describe("Whether the resume is locked."),
	password: z.string().min(6).max(64).nullable().describe("The password of the resume, if any."),
	data: resumeDataSchema,
	userId: z.string().describe("The ID of the user who owns the resume."),
	createdAt: z.date().describe("The date and time the resume was created."),
	updatedAt: z.date().describe("The date and time the resume was last updated."),
});

export const resumeDto = {
	list: {
		input: z
			.object({
				tags: z.array(z.string()).optional().default([]),
				sort: z.enum(["lastUpdatedAt", "createdAt", "name"]).optional().default("lastUpdatedAt"),
			})
			.optional()
			.default({ tags: [], sort: "lastUpdatedAt" }),

		output: z.array(resumeSchema.omit({ data: true, password: true, userId: true })),
	},

	getById: {
		input: resumeSchema.pick({ id: true }),
		output: resumeSchema
			.omit({ password: true, userId: true, createdAt: true, updatedAt: true })
			.extend({ hasPassword: z.boolean() }),
	},

	getBySlug: {
		input: z.object({ username: z.string(), slug: z.string() }),
		output: resumeSchema.omit({ password: true, userId: true, createdAt: true, updatedAt: true }),
	},

	create: {
		input: resumeSchema
			.pick({ name: true, slug: true, tags: true })
			.extend({ withSampleData: z.boolean().default(false) }),
		output: z.string().describe("The ID of the created resume."),
	},

	import: {
		input: resumeSchema.pick({ data: true }),
		output: z.string().describe("The ID of the imported resume."),
	},

	update: {
		input: resumeSchema
			.pick({ name: true, slug: true, tags: true, data: true, isPublic: true })
			.partial()
			.extend({ id: z.string() }),
		output: resumeSchema.omit({ password: true, userId: true, createdAt: true, updatedAt: true }),
	},

	setLocked: {
		input: resumeSchema.pick({ id: true, isLocked: true }),
		output: z.void(),
	},

	setPassword: {
		input: resumeSchema.pick({ id: true }).extend({ password: z.string().min(6).max(64) }),
		output: z.void(),
	},

	removePassword: {
		input: resumeSchema.pick({ id: true }),
		output: z.void(),
	},

	patch: {
		input: z.object({
			id: z.string().describe("The ID of the resume to patch."),
			operations: z
				.array(jsonPatchOperationSchema)
				.min(1)
				.describe("An array of JSON Patch (RFC 6902) operations to apply to the resume data."),
		}),
		output: resumeSchema
			.omit({ password: true, userId: true, createdAt: true, updatedAt: true })
			.extend({ hasPassword: z.boolean() }),
	},

	duplicate: {
		input: resumeSchema.pick({ id: true, name: true, slug: true, tags: true }),
		output: z.string().describe("The ID of the duplicated resume."),
	},

	delete: {
		input: resumeSchema.pick({ id: true }),
		output: z.void(),
	},
};
