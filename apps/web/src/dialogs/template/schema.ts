import z from "zod";

export const templateDialogSchemas = [z.object({ type: z.literal("template.import"), data: z.undefined() })] as const;
