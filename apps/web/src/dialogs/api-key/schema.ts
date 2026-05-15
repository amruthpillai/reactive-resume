import z from "zod";

export const apiKeyDialogSchemas = [z.object({ type: z.literal("api-key.create"), data: z.undefined() })] as const;
