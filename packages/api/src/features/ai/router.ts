import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { UIMessage } from "ai";
import { ORPCError } from "@orpc/client";
import { type } from "@orpc/server";
import { AISDKError } from "ai";
import { flattenError, ZodError, z } from "zod";
import { storedResumeAnalysisSchema } from "@reactive-resume/schema/resume/analysis";
import {
	assistantLanguageSchema,
	atsAnalysisSchema,
	careerCoachPlanSchema,
	careerGrowthPlanSchema,
	jobScamAnalysisSchema,
	resumeWizardDraftSchema,
	salaryNegotiationSchema,
} from "@reactive-resume/schema/resume/assistant";
import { protectedProcedure } from "../../context";
import { aiRequestRateLimit } from "../../middleware/rate-limit";
import { aiProvidersService } from "../ai-providers/service";
import { resumeService } from "../resume/service";
import { aiService, fileInputSchema } from "./service";

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

function throwAiOutputStructureError(error: ZodError): never {
	throw new ORPCError("BAD_REQUEST", {
		message: "Invalid AI assistant output structure",
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

const wizardAnswersSchema = z.object({
	targetRole: z.string().trim().max(4000).optional(),
	seniority: z.string().trim().max(1000).optional(),
	workHistory: z.string().trim().max(8000).optional(),
	education: z.string().trim().max(4000).optional(),
	skills: z.string().trim().max(4000).optional(),
	achievements: z.string().trim().max(4000).optional(),
	links: z.string().trim().max(2000).optional(),
	constraints: z.string().trim().max(2000).optional(),
});

const resumeWizardInputSchema = z
	.object({
		aiProviderId: z.string().optional(),
		mode: z.enum(["guided", "essay"]).default("essay"),
		language: assistantLanguageSchema.default("en"),
		essay: z.string().trim().max(12000).optional(),
		answers: wizardAnswersSchema.optional(),
		jobDescription: z.string().trim().max(20000).optional(),
		offerText: z.string().trim().max(12000).optional(),
		targetSalary: z.string().trim().max(1000).optional(),
		location: z.string().trim().max(1000).optional(),
		includeSalaryNegotiation: z.boolean().default(false),
		includeLinkedInProfile: z.boolean().default(false),
	})
	.refine(
		(value) =>
			Boolean(value.essay?.trim()) || Object.values(value.answers ?? {}).some((answer) => Boolean(answer?.trim())),
		{ message: "Provide either an essay or at least one guided answer." },
	);

const careerCoachInputSchema = z
	.object({
		aiProviderId: z.string().optional(),
		resumeId: z.string().optional(),
		language: assistantLanguageSchema.default("en"),
		currentSituation: z.string().trim().max(12000).optional(),
		targetRole: z.string().trim().max(2000).optional(),
		jobDescription: z.string().trim().max(20000).optional(),
		goals: z.string().trim().max(4000).optional(),
		constraints: z.string().trim().max(4000).optional(),
		timeframe: z.string().trim().max(1000).optional(),
		location: z.string().trim().max(1000).optional(),
	})
	.refine(
		(value) =>
			Boolean(value.resumeId) ||
			Boolean(value.currentSituation?.trim()) ||
			Boolean(value.targetRole?.trim()) ||
			Boolean(value.jobDescription?.trim()),
		{ message: "Provide a resume, current situation, target role, or job description." },
	);

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

	generateResumeDraft: protectedProcedure
		.route({
			method: "POST",
			path: "/ai/resume-wizard",
			tags: ["AI"],
			operationId: "generateResumeWizardDraft",
			summary: "Generate a resume draft from wizard input",
			description:
				"Creates a structured ResumeData draft from a candidate essay or guided answers, optionally tailored to a job description. Returns ATS analysis, career growth suggestions, and optional salary negotiation guidance.",
			successDescription: "The AI resume wizard draft was generated successfully.",
		})
		.input(resumeWizardInputSchema)
		.use(aiRequestRateLimit)
		.output(resumeWizardDraftSchema)
		.errors({
			BAD_GATEWAY: { message: "The AI provider returned an error or is unreachable.", status: 502 },
			BAD_REQUEST: { message: "The AI returned an improperly formatted structure.", status: 400 },
		})
		.handler(async ({ context, input }) => {
			try {
				const provider = await getRunnableProvider(context.user.id, input.aiProviderId);
				return await aiService.generateResumeDraft({
					provider: provider.provider,
					model: provider.model,
					apiKey: provider.apiKey,
					baseURL: provider.baseURL ?? "",
					mode: input.mode,
					language: input.language,
					essay: input.essay,
					answers: input.answers,
					jobDescription: input.jobDescription,
					offerText: input.offerText,
					targetSalary: input.targetSalary,
					location: input.location,
					includeSalaryNegotiation: input.includeSalaryNegotiation,
					includeLinkedInProfile: input.includeLinkedInProfile,
				});
			} catch (error) {
				if (isCredentialEncryptionUnavailable(error)) throwCredentialEncryptionUnavailable();
				if (isInvalidAiBaseUrlError(error)) throwAiProviderConfigError();
				if (isAiProviderGatewayError(error)) throwAiProviderGatewayError();
				if (error instanceof ZodError) throwAiOutputStructureError(error);
				throw error;
			}
		}),

	detectJobScam: protectedProcedure
		.route({
			method: "POST",
			path: "/ai/job-scam-detector",
			tags: ["AI"],
			operationId: "detectJobScam",
			summary: "Detect scam risk in a job description",
			description:
				"Evaluates a pasted job description or offer text for scam-like, misleading, predatory, or too-good-to-be-true signals.",
			successDescription: "Job scam risk analysis returned successfully.",
		})
		.input(
			z.object({
				aiProviderId: z.string().optional(),
				language: assistantLanguageSchema.default("en"),
				jobDescription: z.string().trim().min(1).max(20000),
			}),
		)
		.use(aiRequestRateLimit)
		.output(jobScamAnalysisSchema)
		.errors({
			BAD_GATEWAY: { message: "The AI provider returned an error or is unreachable.", status: 502 },
			BAD_REQUEST: { message: "The AI returned an improperly formatted structure.", status: 400 },
		})
		.handler(async ({ context, input }) => {
			try {
				const provider = await getRunnableProvider(context.user.id, input.aiProviderId);
				return await aiService.detectJobScam({
					provider: provider.provider,
					model: provider.model,
					apiKey: provider.apiKey,
					baseURL: provider.baseURL ?? "",
					language: input.language,
					jobDescription: input.jobDescription,
				});
			} catch (error) {
				if (isCredentialEncryptionUnavailable(error)) throwCredentialEncryptionUnavailable();
				if (isInvalidAiBaseUrlError(error)) throwAiProviderConfigError();
				if (isAiProviderGatewayError(error)) throwAiProviderGatewayError();
				if (error instanceof ZodError) throwAiOutputStructureError(error);
				throw error;
			}
		}),

	coachCareer: protectedProcedure
		.route({
			method: "POST",
			path: "/ai/career-coach",
			tags: ["AI"],
			operationId: "coachCareer",
			summary: "Generate a career coaching plan",
			description:
				"Creates a practical coaching plan for target roles, resume positioning, LinkedIn, networking, interviews, salary strategy, and weekly execution.",
			successDescription: "Career coaching plan returned successfully.",
		})
		.input(careerCoachInputSchema)
		.use(aiRequestRateLimit)
		.output(careerCoachPlanSchema)
		.errors({
			BAD_GATEWAY: { message: "The AI provider returned an error or is unreachable.", status: 502 },
			BAD_REQUEST: { message: "The AI returned an improperly formatted structure.", status: 400 },
		})
		.handler(async ({ context, input }) => {
			try {
				const [provider, resume] = await Promise.all([
					getRunnableProvider(context.user.id, input.aiProviderId),
					input.resumeId
						? resumeService.getById({ id: input.resumeId, userId: context.user.id })
						: Promise.resolve(null),
				]);

				return await aiService.coachCareer({
					provider: provider.provider,
					model: provider.model,
					apiKey: provider.apiKey,
					baseURL: provider.baseURL ?? "",
					language: input.language,
					currentSituation: input.currentSituation,
					targetRole: input.targetRole,
					jobDescription: input.jobDescription,
					goals: input.goals,
					constraints: input.constraints,
					timeframe: input.timeframe,
					location: input.location,
					resumeData: resume?.data,
				});
			} catch (error) {
				if (isCredentialEncryptionUnavailable(error)) throwCredentialEncryptionUnavailable();
				if (isInvalidAiBaseUrlError(error)) throwAiProviderConfigError();
				if (isAiProviderGatewayError(error)) throwAiProviderGatewayError();
				if (error instanceof ZodError) throwAiOutputStructureError(error);
				throw error;
			}
		}),

	analyzeAts: protectedProcedure
		.route({
			method: "POST",
			path: "/ai/analyze-ats",
			tags: ["AI"],
			operationId: "analyzeResumeAts",
			summary: "Analyze resume ATS fit",
			description:
				"Scores resume parseability, keyword coverage, impact, and recruiter usefulness against an optional job description.",
			successDescription: "ATS analysis returned successfully.",
		})
		.input(
			z.object({
				aiProviderId: z.string().optional(),
				resumeId: z.string(),
				language: assistantLanguageSchema.default("en"),
				jobDescription: z.string().trim().max(20000).optional(),
			}),
		)
		.use(aiRequestRateLimit)
		.output(atsAnalysisSchema)
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

				return await aiService.analyzeAts({
					provider: provider.provider,
					model: provider.model,
					apiKey: provider.apiKey,
					baseURL: provider.baseURL ?? "",
					resumeData: resume.data,
					language: input.language,
					jobDescription: input.jobDescription,
				});
			} catch (error) {
				if (isCredentialEncryptionUnavailable(error)) throwCredentialEncryptionUnavailable();
				if (isInvalidAiBaseUrlError(error)) throwAiProviderConfigError();
				if (isAiProviderGatewayError(error)) throwAiProviderGatewayError();
				if (error instanceof ZodError) throwAiOutputStructureError(error);
				throw error;
			}
		}),

	suggestCareerGrowth: protectedProcedure
		.route({
			method: "POST",
			path: "/ai/career-growth",
			tags: ["AI"],
			operationId: "suggestCareerGrowth",
			summary: "Suggest career growth opportunities",
			description:
				"Suggests skills, certifications, diplomas, training, portfolio work, and language improvements based on a resume and optional job description.",
			successDescription: "Career growth recommendations returned successfully.",
		})
		.input(
			z.object({
				aiProviderId: z.string().optional(),
				resumeId: z.string(),
				language: assistantLanguageSchema.default("en"),
				jobDescription: z.string().trim().max(20000).optional(),
			}),
		)
		.use(aiRequestRateLimit)
		.output(careerGrowthPlanSchema)
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

				return await aiService.suggestCareerGrowth({
					provider: provider.provider,
					model: provider.model,
					apiKey: provider.apiKey,
					baseURL: provider.baseURL ?? "",
					resumeData: resume.data,
					language: input.language,
					jobDescription: input.jobDescription,
				});
			} catch (error) {
				if (isCredentialEncryptionUnavailable(error)) throwCredentialEncryptionUnavailable();
				if (isInvalidAiBaseUrlError(error)) throwAiProviderConfigError();
				if (isAiProviderGatewayError(error)) throwAiProviderGatewayError();
				if (error instanceof ZodError) throwAiOutputStructureError(error);
				throw error;
			}
		}),

	negotiateSalary: protectedProcedure
		.route({
			method: "POST",
			path: "/ai/salary-negotiation",
			tags: ["AI"],
			operationId: "negotiateSalary",
			summary: "Create salary negotiation guidance",
			description:
				"Generates salary negotiation positioning, leverage points, scripts, and an email template based on a resume and job or offer context.",
			successDescription: "Salary negotiation guidance returned successfully.",
		})
		.input(
			z.object({
				aiProviderId: z.string().optional(),
				resumeId: z.string(),
				language: assistantLanguageSchema.default("en"),
				jobDescription: z.string().trim().min(1).max(20000),
				offerText: z.string().trim().max(12000).optional(),
				targetSalary: z.string().trim().max(1000).optional(),
				location: z.string().trim().max(1000).optional(),
			}),
		)
		.use(aiRequestRateLimit)
		.output(salaryNegotiationSchema)
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

				return await aiService.negotiateSalary({
					provider: provider.provider,
					model: provider.model,
					apiKey: provider.apiKey,
					baseURL: provider.baseURL ?? "",
					resumeData: resume.data,
					language: input.language,
					jobDescription: input.jobDescription,
					offerText: input.offerText,
					targetSalary: input.targetSalary,
					location: input.location,
				});
			} catch (error) {
				if (isCredentialEncryptionUnavailable(error)) throwCredentialEncryptionUnavailable();
				if (isInvalidAiBaseUrlError(error)) throwAiProviderConfigError();
				if (isAiProviderGatewayError(error)) throwAiProviderGatewayError();
				if (error instanceof ZodError) throwAiOutputStructureError(error);
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
