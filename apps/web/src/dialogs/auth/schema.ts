import z from "zod";

export const authDialogSchemas = [
	z.object({ type: z.literal("auth.change-password"), data: z.undefined() }),
	z.object({ type: z.literal("auth.two-factor.enable"), data: z.undefined() }),
	z.object({ type: z.literal("auth.two-factor.disable"), data: z.undefined() }),
] as const;
