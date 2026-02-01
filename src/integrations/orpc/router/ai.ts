import { ORPCError } from "@orpc/client";
import { AISDKError } from "ai";
import z, { ZodError } from "zod";
import { protectedProcedure } from "../context";
import { aiCredentialsSchema, aiProviderSchema, aiService, fileInputSchema, formatZodError } from "../services/ai";

export const aiRouter = {
	testConnection: protectedProcedure
		.input(
			z.object({
				provider: aiProviderSchema,
				model: z.string(),
				apiKey: z.string(),
				baseURL: z.string(),
			}),
		)
		.handler(async ({ input }) => {
			try {
				return await aiService.testConnection(input);
			} catch (error) {
				if (error instanceof AISDKError) {
					throw new ORPCError("BAD_GATEWAY", { message: error.message });
				}

				throw error;
			}
		}),

	parsePdf: protectedProcedure
		.input(
			z.object({
				...aiCredentialsSchema.shape,
				file: fileInputSchema,
			}),
		)
		.handler(async ({ input }) => {
			try {
				return await aiService.parsePdf(input);
			} catch (error) {
				if (error instanceof AISDKError) {
					throw new ORPCError("BAD_GATEWAY", { message: error.message });
				}

				if (error instanceof ZodError) {
					throw new Error(formatZodError(error));
				}
				throw error;
			}
		}),

	parseDocx: protectedProcedure
		.input(
			z.object({
				...aiCredentialsSchema.shape,
				file: fileInputSchema,
				mediaType: z.enum([
					"application/msword",
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				]),
			}),
		)
		.handler(async ({ input }) => {
			try {
				return await aiService.parseDocx(input);
			} catch (error) {
				if (error instanceof AISDKError) {
					throw new ORPCError("BAD_GATEWAY", { message: error.message });
				}

				if (error instanceof ZodError) {
					throw new Error(formatZodError(error));
				}

				throw error;
			}
		}),
};
