import type { AIProvider } from "@reactive-resume/ai/types";
import type { ResumeAnalysis } from "@reactive-resume/schema/resume/analysis";
import type {
	AssistantLanguage,
	AtsAnalysis,
	CareerCoachPlan,
	CareerGrowthPlan,
	JobScamAnalysis,
	ResumeWizardDraft,
	SalaryNegotiation,
} from "@reactive-resume/schema/resume/assistant";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { ModelMessage, UIMessage } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamToEventIterator } from "@orpc/server";
import { convertToModelMessages, createGateway, generateText, Output, stepCountIs, streamText, tool } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import { match } from "ts-pattern";
import { z } from "zod";
import {
	analyzeResumeSystemPrompt as analyzeResumeSystemPromptTemplate,
	atsAnalysisSystemPrompt,
	careerCoachSystemPrompt,
	careerGrowthSystemPrompt,
	chatSystemPromptTemplate,
	docxParserSystemPrompt,
	docxParserUserPrompt,
	jobScamDetectorSystemPrompt,
	pdfParserSystemPrompt,
	pdfParserUserPrompt,
	resumeWizardSystemPrompt,
	salaryNegotiationSystemPrompt,
} from "@reactive-resume/ai/prompts";
import { buildAiExtractionTemplate } from "@reactive-resume/ai/resume/extraction-template";
import { sanitizeAndParseResumeJson } from "@reactive-resume/ai/resume/sanitize";
import {
	normalizeResumePatchProposals,
	resumePatchProposalToolInputSchema,
	resumePatchProposalToolOutputSchema,
} from "@reactive-resume/ai/tools/patch-proposal";
import { aiProviderSchema } from "@reactive-resume/ai/types";
import { applyResumePatches } from "@reactive-resume/resume/patch";
import { resumeAnalysisOutputSchema, resumeAnalysisSchema } from "@reactive-resume/schema/resume/analysis";
import {
	atsAnalysisSchema,
	careerCoachPlanSchema,
	careerGrowthPlanSchema,
	jobScamAnalysisSchema,
	resumeWizardDraftSchema,
	salaryNegotiationSchema,
} from "@reactive-resume/schema/resume/assistant";
import { supportsProviderNativeWebSearch } from "./capabilities";
import { resolveAiBaseUrl } from "./url-policy";

const aiExtractionTemplate = buildAiExtractionTemplate();

function logAndRethrow(context: string, error: unknown): never {
	if (error instanceof Error) {
		console.error(`${context}:`, error);
		throw error;
	}

	console.error(`${context}:`, error);
	throw new Error(`An unknown error occurred during ${context}.`);
}

function parseAndValidateResumeJson(resultText: string): ResumeData {
	const { data, diagnostics } = sanitizeAndParseResumeJson(resultText);

	if (diagnostics.coercions.length === 0 && diagnostics.droppedSectionItems.length === 0) return data;

	const droppedBySection = diagnostics.droppedSectionItems.reduce<Record<string, number>>((acc, item) => {
		acc[item.section] = (acc[item.section] ?? 0) + 1;
		return acc;
	}, {});

	console.info("AI resume sanitization diagnostics", {
		coercions: diagnostics.coercions.length,
		droppedBySection,
		salvageApplied: diagnostics.salvageApplied,
	});

	return data;
}

function parseJsonObject(resultText: string): unknown {
	let jsonString = resultText.trim();
	const first = jsonString.indexOf("{");
	const last = jsonString.lastIndexOf("}");

	if (first !== -1 && last !== -1 && last >= first) {
		jsonString = jsonString.substring(first, last + 1);
	}

	return JSON.parse(jsonString) as unknown;
}

function setPathValue(root: unknown, path: (string | number)[], value: unknown) {
	let target = root as Record<string, unknown> | unknown[];

	for (let index = 0; index < path.length - 1; index++) {
		const segment = path[index];
		if (segment === undefined || target == null || typeof target !== "object") return;

		target = (target as Record<string, unknown> | unknown[])[segment as never] as Record<string, unknown> | unknown[];
	}

	const last = path.at(-1);
	if (last === undefined || target == null || typeof target !== "object") return;

	(target as Record<string, unknown> | unknown[])[last as never] = value as never;
}

function coerceAtsListItems(draft: Record<string, unknown>) {
	const ats = draft.ats;
	if (typeof ats !== "object" || ats === null) return;

	const atsRecord = ats as Record<string, unknown>;

	if (Array.isArray(atsRecord.bulletImprovements)) {
		atsRecord.bulletImprovements = atsRecord.bulletImprovements.map((item) =>
			typeof item === "string" ? { original: item, improved: item, reason: "AI suggested this improvement." } : item,
		);
	}

	if (Array.isArray(atsRecord.checklist)) {
		atsRecord.checklist = atsRecord.checklist.map((item) =>
			typeof item === "string" ? { item, status: "warning", fix: null } : item,
		);
	}
}

function coerceGrowthSuggestions(draft: Record<string, unknown>) {
	const growth = draft.growth;
	if (typeof growth !== "object" || growth === null) return;

	const growthRecord = growth as Record<string, unknown>;
	if (!Array.isArray(growthRecord.suggestions)) return;

	growthRecord.suggestions = growthRecord.suggestions.map((item) => {
		if (typeof item === "string") {
			return {
				type: "training",
				title: item,
				rationale: item,
				priority: "medium",
				estimatedTime: null,
				providerName: null,
				affiliateUrl: null,
				searchQuery: item,
			};
		}

		if (typeof item !== "object" || item === null) return item;

		const suggestion = item as Record<string, unknown>;
		const title =
			typeof suggestion.title === "string" ? suggestion.title : String(suggestion.name ?? "Career growth item");
		const rationale =
			typeof suggestion.rationale === "string"
				? suggestion.rationale
				: String(suggestion.reason ?? suggestion.description ?? title);

		return {
			...suggestion,
			type:
				typeof suggestion.type === "string" &&
				["skill", "certification", "diploma", "training", "portfolio", "language"].includes(suggestion.type)
					? suggestion.type
					: "training",
			title,
			rationale,
			priority:
				typeof suggestion.priority === "string" && ["high", "medium", "low"].includes(suggestion.priority)
					? suggestion.priority
					: "medium",
			estimatedTime: typeof suggestion.estimatedTime === "string" ? suggestion.estimatedTime : null,
			providerName: typeof suggestion.providerName === "string" ? suggestion.providerName : null,
			affiliateUrl: typeof suggestion.affiliateUrl === "string" ? suggestion.affiliateUrl : null,
			searchQuery: typeof suggestion.searchQuery === "string" ? suggestion.searchQuery : title,
		};
	});
}

function coerceSalaryNegotiation(draft: Record<string, unknown>) {
	const salaryNegotiation = draft.salaryNegotiation;
	if (salaryNegotiation == null) return;
	if (typeof salaryNegotiation !== "object") {
		draft.salaryNegotiation = null;
		return;
	}

	const salary = salaryNegotiation as Record<string, unknown>;
	const scripts = Array.isArray(salary.scripts)
		? salary.scripts.map((item) => {
				if (typeof item === "string") return { scenario: "Negotiation", message: item };
				if (typeof item !== "object" || item === null) return item;

				const script = item as Record<string, unknown>;
				return {
					scenario: typeof script.scenario === "string" ? script.scenario : "Negotiation",
					message:
						typeof script.message === "string"
							? script.message
							: String(script.script ?? script.text ?? "Discuss compensation professionally."),
				};
			})
		: [];

	draft.salaryNegotiation = {
		marketPositioning:
			typeof salary.marketPositioning === "string"
				? salary.marketPositioning
				: String(salary.positioning ?? "Position compensation around verified skills, reliability, and job fit."),
		leveragePoints: Array.isArray(salary.leveragePoints) ? salary.leveragePoints.map(String).filter(Boolean) : [],
		risks: Array.isArray(salary.risks) ? salary.risks.map(String).filter(Boolean) : [],
		suggestedRange:
			typeof salary.suggestedRange === "object" && salary.suggestedRange !== null ? salary.suggestedRange : null,
		scripts,
		emailTemplate:
			typeof salary.emailTemplate === "string"
				? salary.emailTemplate
				: "Thank you for the offer. Based on my experience and the responsibilities of this role, I would like to discuss the compensation range.",
		language:
			typeof salary.language === "string" &&
			["en", "es", "fr", "ar", "pt", "de", "ja", "ko", "zh"].includes(salary.language)
				? salary.language
				: "en",
	};
}

function coerceLinkedInProfile(draft: Record<string, unknown>) {
	const linkedinProfile = draft.linkedinProfile;
	if (linkedinProfile == null) return;
	if (typeof linkedinProfile !== "object") {
		draft.linkedinProfile = null;
		return;
	}

	const profile = linkedinProfile as Record<string, unknown>;
	const headline =
		typeof profile.headline === "string"
			? profile.headline
			: String(profile.title ?? "Reliable skilled trades professional");
	const about =
		typeof profile.about === "string"
			? profile.about
			: String(
					profile.summary ?? profile.bio ?? "Experienced professional focused on quality work and customer service.",
				);

	const experienceRewrites = Array.isArray(profile.experienceRewrites)
		? profile.experienceRewrites.map((item) => {
				if (typeof item === "string") return { role: "Experience", company: null, rewrite: item };
				if (typeof item !== "object" || item === null) return item;

				const rewrite = item as Record<string, unknown>;
				return {
					role: typeof rewrite.role === "string" ? rewrite.role : String(rewrite.title ?? "Experience"),
					company: typeof rewrite.company === "string" ? rewrite.company : null,
					rewrite:
						typeof rewrite.rewrite === "string"
							? rewrite.rewrite
							: String(rewrite.summary ?? rewrite.description ?? "Highlight measurable impact and customer outcomes."),
				};
			})
		: [];

	const featuredSuggestions = Array.isArray(profile.featuredSuggestions)
		? profile.featuredSuggestions.map((item) => {
				if (typeof item === "string") return item;
				if (typeof item !== "object" || item === null) return String(item);

				const suggestion = item as Record<string, unknown>;
				return String(
					suggestion.title ?? suggestion.description ?? suggestion.name ?? "Add a relevant project or credential.",
				);
			})
		: [];

	draft.linkedinProfile = {
		headline,
		about,
		experienceRewrites,
		featuredSuggestions,
		skills: Array.isArray(profile.skills) ? profile.skills.map(String).filter(Boolean) : [],
		connectionNote:
			typeof profile.connectionNote === "string"
				? profile.connectionNote
				: "Hi, I would be glad to connect and learn more about opportunities where my background could help.",
		recruiterMessage:
			typeof profile.recruiterMessage === "string"
				? profile.recruiterMessage
				: "Hello, I am exploring roles that match my experience and would welcome a conversation about relevant opportunities.",
		language:
			typeof profile.language === "string" &&
			["en", "es", "fr", "ar", "pt", "de", "ja", "ko", "zh"].includes(profile.language)
				? profile.language
				: "en",
	};
}

function normalizeWizardDraftOutput(output: unknown): unknown {
	if (typeof output !== "object" || output === null) return output;

	const draft = structuredClone(output) as Record<string, unknown>;

	const normalized = {
		...draft,
		salaryNegotiation: draft.salaryNegotiation ?? null,
		linkedinProfile: draft.linkedinProfile ?? null,
		notes: Array.isArray(draft.notes) ? draft.notes : [],
	};

	coerceAtsListItems(normalized);
	coerceGrowthSuggestions(normalized);
	coerceSalaryNegotiation(normalized);
	coerceLinkedInProfile(normalized);

	const parsed = resumeWizardDraftSchema.safeParse(normalized);
	if (parsed.success) return parsed.data;

	for (const issue of parsed.error.issues) {
		if (issue.path[0] === "resumeData" && issue.code === "too_small") {
			const path = issue.path.filter((segment): segment is string | number => typeof segment !== "symbol");
			setPathValue(normalized, path, "Not specified");
		}
	}

	return normalized;
}

type GetModelInput = {
	provider: AIProvider;
	model: string;
	apiKey: string;
	baseURL?: string;
};

const MAX_AI_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_AI_FILE_BASE64_CHARS = Math.ceil((MAX_AI_FILE_BYTES * 4) / 3) + 4;

export function getModel(input: GetModelInput) {
	const { provider, model, apiKey } = input;
	const baseURL = resolveAiBaseUrl(input);

	return match(provider)
		.with("openai", () => createOpenAI({ apiKey, baseURL }).chat(model))
		.with("anthropic", () => createAnthropic({ apiKey, baseURL }).languageModel(model))
		.with("gemini", () => createGoogleGenerativeAI({ apiKey, baseURL }).languageModel(model))
		.with("vercel-ai-gateway", () => createGateway({ apiKey, baseURL }).languageModel(model))
		.with("openrouter", () => createOpenAICompatible({ name: "openrouter", apiKey, baseURL }).languageModel(model))
		.with("openai-compatible", () =>
			createOpenAICompatible({ name: "openai-compatible", apiKey, baseURL }).languageModel(model),
		)
		.with("ollama", () => {
			const ollama = createOllama({
				name: "ollama",
				baseURL,
				...(apiKey ? { headers: { Authorization: `Bearer ${apiKey}` } } : {}),
			});

			return ollama.languageModel(model);
		})
		.exhaustive();
}

export function getAgentModel(input: GetModelInput) {
	if (!supportsProviderNativeWebSearch(input)) return getModel(input);

	return createOpenAI({ apiKey: input.apiKey, baseURL: resolveAiBaseUrl(input) }).responses(input.model);
}

const aiCredentialsSchema = z.object({
	provider: aiProviderSchema,
	model: z.string().trim().min(1),
	apiKey: z.string().trim().min(1),
	baseURL: z.string().optional().default(""),
});

export const fileInputSchema = z.object({
	name: z.string(),
	data: z.string().max(MAX_AI_FILE_BASE64_CHARS, "File is too large. Maximum size is 10MB."),
});

type TestConnectionInput = z.infer<typeof aiCredentialsSchema>;

export async function testConnection(input: TestConnectionInput): Promise<boolean> {
	const RESPONSE_OK = "1";

	const result = await generateText({
		model: getModel(input),
		output: Output.choice({ options: [RESPONSE_OK] }),
		messages: [{ role: "user", content: `Respond only with JSON Object: { "result": "${RESPONSE_OK}" }` }],
	});

	return result.output === RESPONSE_OK;
}

type ParsePdfInput = z.infer<typeof aiCredentialsSchema> & {
	file: z.infer<typeof fileInputSchema>;
};

type BuildResumeParsingMessagesInput = {
	systemPrompt: string;
	userPrompt: string;
	file: z.infer<typeof fileInputSchema>;
	mediaType: string;
};

function buildResumeParsingMessages({
	systemPrompt,
	userPrompt,
	file,
	mediaType,
}: BuildResumeParsingMessagesInput): ModelMessage[] {
	return [
		{
			role: "system",
			content: `${systemPrompt}\n\nIMPORTANT: You must return ONLY raw valid JSON. Do not return markdown, do not return explanations. Just the JSON object. Use the following JSON as a template and fill in the extracted values. For arrays, you MUST use the exact key names shown in the template (e.g. use 'description' instead of 'summary', 'website' instead of 'url'):\n\n${JSON.stringify(aiExtractionTemplate, null, 2)}`,
		},
		{
			role: "user",
			content: [
				{ type: "text", text: userPrompt },
				{ type: "file", data: file.data, mediaType, filename: file.name },
			],
		},
	];
}

async function parsePdf(input: ParsePdfInput): Promise<ResumeData> {
	const model = getModel(input);

	const result = await generateText({
		model,
		messages: buildResumeParsingMessages({
			systemPrompt: pdfParserSystemPrompt,
			userPrompt: pdfParserUserPrompt,
			file: input.file,
			mediaType: "application/pdf",
		}),
	}).catch((error: unknown) => logAndRethrow("Failed to generate the text with the model", error));

	return parseAndValidateResumeJson(result.text);
}

type ParseDocxInput = z.infer<typeof aiCredentialsSchema> & {
	file: z.infer<typeof fileInputSchema>;
	mediaType: "application/msword" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
};

async function parseDocx(input: ParseDocxInput): Promise<ResumeData> {
	const model = getModel(input);

	const result = await generateText({
		model,
		messages: buildResumeParsingMessages({
			systemPrompt: docxParserSystemPrompt,
			userPrompt: docxParserUserPrompt,
			file: input.file,
			mediaType: input.mediaType,
		}),
	}).catch((error: unknown) => logAndRethrow("Failed to generate the text with the model", error));

	return parseAndValidateResumeJson(result.text);
}

function buildChatSystemPrompt(resumeData: ResumeData): string {
	return chatSystemPromptTemplate.replace("{{RESUME_DATA}}", JSON.stringify(resumeData, null, 2));
}

type ChatInput = z.infer<typeof aiCredentialsSchema> & {
	messages: UIMessage[];
	resumeData: ResumeData;
	resumeUpdatedAt: Date;
};

async function chat(input: ChatInput) {
	const model = getModel(input);
	const systemPrompt = buildChatSystemPrompt(input.resumeData);

	const result = streamText({
		model,
		system: systemPrompt,
		messages: await convertToModelMessages(input.messages),
		tools: {
			propose_resume_patches: tool({
				description:
					"Return one or more cohesive resume change proposals. Each proposal must include a title, optional summary, and valid JSON Patch operations against the current resume data. The tool validates but does not apply changes.",
				inputSchema: resumePatchProposalToolInputSchema,
				outputSchema: resumePatchProposalToolOutputSchema,
				execute: async (toolInput) => {
					const proposals = normalizeResumePatchProposals(toolInput, input.resumeUpdatedAt);

					for (const proposal of proposals) {
						applyResumePatches(input.resumeData, proposal.operations);
					}

					return { proposals };
				},
			}),
		},
		stopWhen: stepCountIs(3),
	});

	return streamToEventIterator(result.toUIMessageStream());
}

type AnalyzeResumeInput = z.infer<typeof aiCredentialsSchema> & {
	resumeData: ResumeData;
};

function buildAnalyzeResumeSystemPrompt(resumeData: ResumeData): string {
	return `${analyzeResumeSystemPromptTemplate}\n\n## Resume Data\n\n${JSON.stringify(resumeData, null, 2)}`;
}

async function analyzeResume(input: AnalyzeResumeInput): Promise<ResumeAnalysis> {
	const model = getModel(input);
	const systemPrompt = buildAnalyzeResumeSystemPrompt(input.resumeData);

	const result = await generateText({
		model,
		output: Output.object({ schema: resumeAnalysisOutputSchema }),
		messages: [
			{ role: "system", content: systemPrompt },
			{
				role: "user",
				content:
					"Analyze this resume and return a structured report with scorecard, overall score, strengths, and actionable suggestions.",
			},
		],
	});

	if (result.output == null) {
		throw new Error("AI returned no structured analysis output.");
	}

	return resumeAnalysisSchema.parse(result.output);
}

type GenerateResumeDraftInput = z.infer<typeof aiCredentialsSchema> & {
	mode: "guided" | "essay";
	language: AssistantLanguage;
	essay?: string | undefined;
	answers?: Record<string, string | undefined> | undefined;
	jobDescription?: string | undefined;
	offerText?: string | undefined;
	targetSalary?: string | undefined;
	location?: string | undefined;
	includeSalaryNegotiation: boolean;
	includeLinkedInProfile: boolean;
};

async function generateResumeDraft(input: GenerateResumeDraftInput): Promise<ResumeWizardDraft> {
	const model = getModel(input);
	const outputTemplate = {
		resumeName: "Target Role Resume",
		resumeData: aiExtractionTemplate,
		ats: {
			overallScore: 0,
			parseabilityScore: 0,
			keywordScore: 0,
			impactScore: 0,
			recruiterScore: 0,
			summary: "",
			formattingFlags: [],
			missingKeywords: [],
			matchedKeywords: [],
			bulletImprovements: [],
			checklist: [],
		},
		growth: {
			positioningNotes: [],
			suggestions: [],
		},
		salaryNegotiation: null,
		linkedinProfile: null,
		notes: [],
	};

	const result = await generateText({
		model,
		system: `${resumeWizardSystemPrompt}\n\nReturn ONLY raw valid JSON. Do not return markdown, code fences, or explanations. The top-level object must include exactly these product fields: resumeName, resumeData, ats, growth, salaryNegotiation, linkedinProfile, notes. Use this complete JSON shape as the template. Fill unknown scalar values with empty strings and unknown arrays with empty arrays. Generate unique string IDs for all resume section items. If salary negotiation or LinkedIn output was not requested, return null for that field.\n\n${JSON.stringify(outputTemplate, null, 2)}`,
		messages: [
			{
				role: "user",
				content: JSON.stringify(
					{
						mode: input.mode,
						language: input.language,
						essay: input.essay ?? "",
						answers: input.answers ?? {},
						jobDescription: input.jobDescription ?? "",
						offerText: input.offerText ?? "",
						targetSalary: input.targetSalary ?? "",
						location: input.location ?? "",
						includeSalaryNegotiation: input.includeSalaryNegotiation,
						includeLinkedInProfile: input.includeLinkedInProfile,
					},
					null,
					2,
				),
			},
		],
	});

	return resumeWizardDraftSchema.parse(normalizeWizardDraftOutput(parseJsonObject(result.text)));
}

type AnalyzeAtsInput = z.infer<typeof aiCredentialsSchema> & {
	resumeData: ResumeData;
	language: AssistantLanguage;
	jobDescription?: string | undefined;
};

async function analyzeAts(input: AnalyzeAtsInput): Promise<AtsAnalysis> {
	const model = getModel(input);

	const result = await generateText({
		model,
		output: Output.object({ schema: atsAnalysisSchema }),
		messages: [
			{ role: "system", content: atsAnalysisSystemPrompt },
			{
				role: "user",
				content: JSON.stringify(
					{
						language: input.language,
						resumeData: input.resumeData,
						jobDescription: input.jobDescription ?? "",
					},
					null,
					2,
				),
			},
		],
	});

	if (result.output == null) throw new Error("AI returned no ATS analysis output.");

	return atsAnalysisSchema.parse(result.output);
}

type DetectJobScamInput = z.infer<typeof aiCredentialsSchema> & {
	language: AssistantLanguage;
	jobDescription: string;
};

async function detectJobScam(input: DetectJobScamInput): Promise<JobScamAnalysis> {
	const model = getModel(input);

	const result = await generateText({
		model,
		output: Output.object({ schema: jobScamAnalysisSchema }),
		messages: [
			{ role: "system", content: jobScamDetectorSystemPrompt },
			{
				role: "user",
				content: JSON.stringify(
					{
						language: input.language,
						jobDescription: input.jobDescription,
					},
					null,
					2,
				),
			},
		],
	});

	if (result.output == null) throw new Error("AI returned no job scam analysis output.");

	return jobScamAnalysisSchema.parse(result.output);
}

type CoachCareerInput = z.infer<typeof aiCredentialsSchema> & {
	language: AssistantLanguage;
	currentSituation?: string | undefined;
	targetRole?: string | undefined;
	jobDescription?: string | undefined;
	goals?: string | undefined;
	constraints?: string | undefined;
	timeframe?: string | undefined;
	location?: string | undefined;
	resumeData?: ResumeData | undefined;
};

async function coachCareer(input: CoachCareerInput): Promise<CareerCoachPlan> {
	const model = getModel(input);

	const result = await generateText({
		model,
		output: Output.object({ schema: careerCoachPlanSchema }),
		messages: [
			{ role: "system", content: careerCoachSystemPrompt },
			{
				role: "user",
				content: JSON.stringify(
					{
						language: input.language,
						currentSituation: input.currentSituation ?? "",
						targetRole: input.targetRole ?? "",
						jobDescription: input.jobDescription ?? "",
						goals: input.goals ?? "",
						constraints: input.constraints ?? "",
						timeframe: input.timeframe ?? "",
						location: input.location ?? "",
						resumeData: input.resumeData ?? null,
					},
					null,
					2,
				),
			},
		],
	});

	if (result.output == null) throw new Error("AI returned no career coach output.");

	return careerCoachPlanSchema.parse(result.output);
}

type SuggestCareerGrowthInput = z.infer<typeof aiCredentialsSchema> & {
	resumeData: ResumeData;
	language: AssistantLanguage;
	jobDescription?: string | undefined;
};

async function suggestCareerGrowth(input: SuggestCareerGrowthInput): Promise<CareerGrowthPlan> {
	const model = getModel(input);

	const result = await generateText({
		model,
		output: Output.object({ schema: careerGrowthPlanSchema }),
		messages: [
			{ role: "system", content: careerGrowthSystemPrompt },
			{
				role: "user",
				content: JSON.stringify(
					{
						language: input.language,
						resumeData: input.resumeData,
						jobDescription: input.jobDescription ?? "",
					},
					null,
					2,
				),
			},
		],
	});

	if (result.output == null) throw new Error("AI returned no career growth output.");

	return careerGrowthPlanSchema.parse(result.output);
}

type NegotiateSalaryInput = z.infer<typeof aiCredentialsSchema> & {
	resumeData: ResumeData;
	language: AssistantLanguage;
	jobDescription: string;
	offerText?: string | undefined;
	targetSalary?: string | undefined;
	location?: string | undefined;
};

async function negotiateSalary(input: NegotiateSalaryInput): Promise<SalaryNegotiation> {
	const model = getModel(input);

	const result = await generateText({
		model,
		output: Output.object({ schema: salaryNegotiationSchema }),
		messages: [
			{ role: "system", content: salaryNegotiationSystemPrompt },
			{
				role: "user",
				content: JSON.stringify(
					{
						language: input.language,
						resumeData: input.resumeData,
						jobDescription: input.jobDescription,
						offerText: input.offerText ?? "",
						targetSalary: input.targetSalary ?? "",
						location: input.location ?? "",
					},
					null,
					2,
				),
			},
		],
	});

	if (result.output == null) throw new Error("AI returned no salary negotiation output.");

	return salaryNegotiationSchema.parse(result.output);
}

export const aiService = {
	analyzeResume,
	analyzeAts,
	chat,
	coachCareer,
	detectJobScam,
	generateResumeDraft,
	negotiateSalary,
	parseDocx,
	parsePdf,
	suggestCareerGrowth,
	testConnection,
};
