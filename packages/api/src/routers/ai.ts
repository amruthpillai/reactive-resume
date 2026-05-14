import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { UIMessage } from "ai";
import { ORPCError } from "@orpc/client";
import { type } from "@orpc/server";
import { AISDKError } from "ai";
import { flattenError, ZodError, z } from "zod";
import { storedResumeAnalysisSchema } from "@reactive-resume/schema/resume/analysis";
import { protectedProcedure } from "../context";
import { aiRequestRateLimit } from "../middleware/rate-limit";
import { aiService, fileInputSchema } from "../services/ai";
import { aiProvidersService } from "../services/ai-providers";
import { resumeService } from "../services/resume";

function isInvalidAiBaseUrlError(error: unknown): boolean {
	return error instanceof Error && error.message === "INVALID_AI_BASE_URL";
}

function isAiProviderGatewayError(error: unknown): boolean {
	return error instanceof AISDKError;
}

function isCredentialEncryptionUnavailable(error: unknown): boolean {
	return error instanceof Error && error.message === "AI_CREDENTIAL_ENCRYPTION_UNAVAILABLE";
}

function throwAiProviderGatewayError(): never {
	throw new ORPCError("BAD_GATEWAY", { message: "Could not reach the AI provider." });
}

function throwAiProviderConfigError(): never {
	throw new ORPCError("BAD_REQUEST", { message: "Invalid AI provider configuration." });
}

function throwCredentialEncryptionUnavailable(): never {
	throw new ORPCError("PRECONDITION_FAILED", {
		message: "AI providers are unavailable because ENCRYPTION_SECRET is not configured.",
	});
}

function throwResumeStructureError(error: ZodError): never {
	throw new ORPCError("BAD_REQUEST", {
		message: "Invalid resume data structure",
		cause: flattenError(error),
	});
}

async function getRunnableProvider(userId: string, aiProviderId?: string) {
	const provider = aiProviderId
		? await aiProvidersService.getRunnableById({ id: aiProviderId, userId })
		: await aiProvidersService.getDefaultRunnable({ userId });

	if (!provider) throw new ORPCError("BAD_REQUEST", { message: "No tested AI provider is available." });

	return provider;
}

export const aiRouter = {
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
		.input(z.object({ aiProviderId: z.string().optional(), file: fileInputSchema }))
		.use(aiRequestRateLimit)
		.errors({
			BAD_GATEWAY: { message: "The AI provider returned an error or is unreachable.", status: 502 },
			BAD_REQUEST: { message: "The AI returned an improperly formatted structure.", status: 400 },
		})
		.handler(async ({ context, input }): Promise<ResumeData> => {
			try {
				const provider = await getRunnableProvider(context.user.id, input.aiProviderId);
				return await aiService.parsePdf({
					provider: provider.provider,
					model: provider.model,
					apiKey: provider.apiKey,
					baseURL: provider.baseURL ?? "",
					file: input.file,
				});
			} catch (error) {
				if (isCredentialEncryptionUnavailable(error)) throwCredentialEncryptionUnavailable();
				if (isInvalidAiBaseUrlError(error)) throwAiProviderConfigError();
				if (isAiProviderGatewayError(error)) throwAiProviderGatewayError();
				if (error instanceof ZodError) throwResumeStructureError(error);
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
				aiProviderId: z.string().optional(),
				file: fileInputSchema,
				mediaType: z.enum([
					"application/msword",
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				]),
			}),
		)
		.use(aiRequestRateLimit)
		.errors({
			BAD_GATEWAY: { message: "The AI provider returned an error or is unreachable.", status: 502 },
			BAD_REQUEST: { message: "The AI returned an improperly formatted structure.", status: 400 },
		})
		.handler(async ({ context, input }) => {
			try {
				const provider = await getRunnableProvider(context.user.id, input.aiProviderId);
				return await aiService.parseDocx({
					provider: provider.provider,
					model: provider.model,
					apiKey: provider.apiKey,
					baseURL: provider.baseURL ?? "",
					mediaType: input.mediaType,
					file: input.file,
				});
			} catch (error) {
				if (isCredentialEncryptionUnavailable(error)) throwCredentialEncryptionUnavailable();
				if (isInvalidAiBaseUrlError(error)) throwAiProviderConfigError();
				if (isAiProviderGatewayError(error)) throwAiProviderGatewayError();
				if (error instanceof ZodError) throwResumeStructureError(error);
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
				"Streams a chat response from the configured AI provider. The LLM can call the propose_resume_patches tool to generate JSON Patch proposals for explicit user approval. Requires authentication and AI provider credentials.",
		})
		.input(
			type<{
				aiProviderId?: string;
				messages: UIMessage[];
				resumeId: string;
			}>(),
		)
		.use(aiRequestRateLimit)
		.handler(async ({ context, input }) => {
			try {
				const [provider, resume] = await Promise.all([
					getRunnableProvider(context.user.id, input.aiProviderId),
					resumeService.getById({ id: input.resumeId, userId: context.user.id }),
				]);

				return await aiService.chat({
					provider: provider.provider,
					model: provider.model,
					apiKey: provider.apiKey,
					baseURL: provider.baseURL ?? "",
					messages: input.messages,
					resumeData: resume.data,
					resumeUpdatedAt: resume.updatedAt,
				});
			} catch (error) {
				if (isCredentialEncryptionUnavailable(error)) throwCredentialEncryptionUnavailable();
				if (isInvalidAiBaseUrlError(error)) throwAiProviderConfigError();
				if (isAiProviderGatewayError(error)) throwAiProviderGatewayError();
				throw error;
			}
		}),

	analyzeResume: protectedProcedure
		.route({
			method: "POST",
			path: "/ai/analyze-resume",
			tags: ["AI"],
			operationId: "analyzeResume",
			summary: "Analyze resume and persist latest analysis",
			description:
				"Uses AI to analyze the current resume and returns a structured analysis with scorecard, strengths, and improvement suggestions. The latest analysis is persisted and can be fetched later. Requires authentication and AI credentials.",
			successDescription: "Structured resume analysis returned and persisted successfully.",
		})
		.input(
			z.object({
				aiProviderId: z.string().optional(),
				resumeId: z.string(),
			}),
		)
		.use(aiRequestRateLimit)
		.output(storedResumeAnalysisSchema)
		.errors({
			BAD_GATEWAY: { message: "The AI provider returned an error or is unreachable.", status: 502 },
			BAD_REQUEST: { message: "The AI returned an improperly formatted structure.", status: 400 },
		})
		.handler(async ({ context, input }) => {
			try {
				const [provider, resume] = await Promise.all([
					getRunnableProvider(context.user.id, input.aiProviderId),
					resumeService.getById({ id: input.resumeId, userId: context.user.id }),
				]);
				const analysis = await aiService.analyzeResume({
					provider: provider.provider,
					model: provider.model,
					apiKey: provider.apiKey,
					baseURL: provider.baseURL ?? "",
					resumeData: resume.data,
				});

				return await resumeService.analysis.upsert({
					id: input.resumeId,
					userId: context.user.id,
					analysis: {
						...analysis,
						updatedAt: new Date(),
						modelMeta: { provider: provider.provider, model: provider.model },
					},
				});
			} catch (error) {
				if (isCredentialEncryptionUnavailable(error)) throwCredentialEncryptionUnavailable();
				if (isInvalidAiBaseUrlError(error)) throwAiProviderConfigError();
				if (isAiProviderGatewayError(error)) throwAiProviderGatewayError();
				if (error instanceof ZodError) {
					throw new ORPCError("BAD_REQUEST", {
						message: "Invalid resume analysis structure",
						cause: flattenError(error),
					});
				}
				throw error;
			}
		}),
};
