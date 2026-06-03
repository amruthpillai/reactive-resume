import { createSelectSchema } from "drizzle-zod";
import z from "zod";
import * as schema from "@reactive-resume/db/schema";
import { customTemplateDataSchema } from "@reactive-resume/schema/custom-template";

const customTemplateSchema = createSelectSchema(schema.customTemplate, {
	id: z.string(),
	name: z.string().trim().min(1),
	data: customTemplateDataSchema,
	userId: z.string(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const customTemplateDto = {
	list: {
		output: z.array(customTemplateSchema.omit({ userId: true })),
	},

	getById: {
		input: customTemplateSchema.pick({ id: true }),
		output: customTemplateSchema.omit({ userId: true }),
	},

	create: {
		input: customTemplateSchema.pick({ name: true, data: true }),
		output: z.string().describe("The ID of the created custom template."),
	},

	update: {
		input: customTemplateSchema.pick({ name: true, data: true }).partial().extend({ id: z.string() }),
		output: customTemplateSchema.omit({ userId: true }),
	},

	delete: {
		input: customTemplateSchema.pick({ id: true }),
		output: z.void(),
	},
};
