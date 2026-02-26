import { ORPCError } from "@orpc/client";
import { type } from "@orpc/server";
import { AISDKError, type UIMessage } from "ai";
import { OllamaError } from "ai-sdk-ollama";
import z, { ZodError } from "zod";
import type { ResumeData } from "@/schema/resume/data";
import { protectedProcedure } from "../context";
import { aiCredentialsSchema, aiProviderSchema, aiService, fileInputSchema, formatZodError } from "../services/ai";

type AIProvider = z.infer<typeof aiProviderSchema>;

export const aiRouter = {
	testConnection: protectedProcedure
		.route({
			method: "POST",
			path: "/ai/test-connection",
			tags: ["AI"],
			operationId: "testAiConnection",
			summary: "Test AI provider connection",
			description:
				"Validates the connection to an AI provider by sending a simple test prompt. Requires the provider type, model name, API key, and an optional base URL. Supported providers: OpenAI, Anthropic, Google Gemini, Ollama, and Vercel AI Gateway. Requires authentication.",
			successDescription: "The AI provider connection was successful.",
		})
		.input(
			z.object({
				provider: aiProviderSchema,
				model: z.string(),
				apiKey: z.string(),
				baseURL: z.string(),
			}),
		)
		.errors({
			BAD_GATEWAY: {
				message: "The AI provider returned an error or is unreachable.",
				status: 502,
			},
		})
		.handler(async ({ input }) => {
			try {
				return await aiService.testConnection(input);
			} catch (error) {
				if (error instanceof AISDKError || error instanceof OllamaError) {
					throw new ORPCError("BAD_GATEWAY", { message: error.message });
				}

				throw error;
			}
		}),

	parsePdf: protectedProcedure
		.route({
			method: "POST",
			path: "/ai/parse-pdf",
			tags: ["AI"],
			operationId: "parseResumePdf",
			summary: "Parse a PDF file into resume data",
			description:
				"Extracts structured resume data from a PDF file using the specified AI provider. The file should be sent as a base64-encoded string along with AI provider credentials. Returns a complete ResumeData object. Requires authentication.",
			successDescription: "The PDF was successfully parsed into structured resume data.",
		})
		.input(
			z.object({
				...aiCredentialsSchema.shape,
				file: fileInputSchema,
			}),
		)
		.errors({
			BAD_GATEWAY: {
				message: "The AI provider returned an error or is unreachable.",
				status: 502,
			},
		})
		.handler(async ({ input }): Promise<ResumeData> => {
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
		.route({
			method: "POST",
			path: "/ai/parse-docx",
			tags: ["AI"],
			operationId: "parseResumeDocx",
			summary: "Parse a DOCX file into resume data",
			description:
				"Extracts structured resume data from a DOCX or DOC file using the specified AI provider. The file should be sent as a base64-encoded string along with AI provider credentials and the document's media type. Returns a complete ResumeData object. Requires authentication.",
			successDescription: "The DOCX was successfully parsed into structured resume data.",
		})
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
		.errors({
			BAD_GATEWAY: {
				message: "The AI provider returned an error or is unreachable.",
				status: 502,
			},
		})
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

	chat: protectedProcedure
		.route({
			method: "POST",
			path: "/ai/chat",
			tags: ["AI"],
			operationId: "aiChat",
			summary: "Chat with AI to modify resume",
			description:
				"Streams a chat response from the configured AI provider. The LLM can call the patch_resume tool to generate JSON Patch operations that modify the resume. Requires authentication and AI provider credentials.",
		})
		.input(
			type<{
				provider: AIProvider;
				model: string;
				apiKey: string;
				baseURL: string;
				messages: UIMessage[];
				resumeData: ResumeData;
			}>(),
		)
		.handler(async ({ input }) => {
			try {
				return await aiService.chat(input);
			} catch (error) {
				if (error instanceof AISDKError || error instanceof OllamaError) {
					throw new ORPCError("BAD_GATEWAY", { message: error.message });
				}

				throw error;
			}
		}),
};
