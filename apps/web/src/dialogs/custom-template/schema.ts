import z from "zod";

export const customTemplateDialogSchemas = [
	z.object({ type: z.literal("custom-template.create"), data: z.undefined() }),
	z.object({
		type: z.literal("custom-template.update"),
		data: z.object({ id: z.string(), name: z.string() }),
	}),
	z.object({
		type: z.literal("custom-template.delete"),
		data: z.object({ id: z.string(), name: z.string() }),
	}),
] as const;
