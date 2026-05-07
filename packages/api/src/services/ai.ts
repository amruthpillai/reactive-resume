import type { AIProvider } from "@reactive-resume/ai/types";
import type { ResumeAnalysis } from "@reactive-resume/schema/resume/analysis";
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
	chatSystemPromptTemplate,
	docxParserSystemPrompt,
	docxParserUserPrompt,
	pdfParserSystemPrompt,
	pdfParserUserPrompt,
} from "@reactive-resume/ai/prompts";
import { buildAiExtractionTemplate } from "@reactive-resume/ai/resume/extraction-template";
import { sanitizeAndParseResumeJson } from "@reactive-resume/ai/resume/sanitize";
import {
	executePatchResume,
	patchResumeDescription,
	patchResumeInputSchema,
} from "@reactive-resume/ai/tools/patch-resume";
import { AI_PROVIDER_DEFAULT_BASE_URLS, aiProviderSchema } from "@reactive-resume/ai/types";
import { resumeAnalysisOutputSchema, resumeAnalysisSchema } from "@reactive-resume/schema/resume/analysis";
import { isPrivateOrLoopbackHost, parseUrl } from "@reactive-resume/utils/url-security";

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

type GetModelInput = {
	provider: AIProvider;
	model: string;
	apiKey: string;
	baseURL?: string;
};

const MAX_AI_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_AI_FILE_BASE64_CHARS = Math.ceil((MAX_AI_FILE_BYTES * 4) / 3) + 4;

function resolveBaseUrl(input: GetModelInput): string {
	const baseURL = input.baseURL?.trim() || AI_PROVIDER_DEFAULT_BASE_URLS[input.provider];

	if (!baseURL) throw new Error("INVALID_AI_BASE_URL");

	const parsedBaseURL = parseUrl(baseURL);
	if (!parsedBaseURL) throw new Error("INVALID_AI_BASE_URL");
	if (parsedBaseURL.protocol !== "https:") throw new Error("INVALID_AI_BASE_URL");
	if (parsedBaseURL.username || parsedBaseURL.password) throw new Error("INVALID_AI_BASE_URL");
	if (isPrivateOrLoopbackHost(parsedBaseURL.hostname)) throw new Error("INVALID_AI_BASE_URL");

	return parsedBaseURL.toString();
}

function getModel(input: GetModelInput) {
	const { provider, model, apiKey } = input;
	const baseURL = resolveBaseUrl(input);

	return match(provider)
		.with("openai", () => createOpenAI({ apiKey, baseURL }).chat(model))
		.with("anthropic", () => createAnthropic({ apiKey, baseURL }).languageModel(model))
		.with("gemini", () => createGoogleGenerativeAI({ apiKey, baseURL }).languageModel(model))
		.with("vercel-ai-gateway", () => createGateway({ apiKey, baseURL }).languageModel(model))
		.with("openrouter", () => createOpenAICompatible({ name: "openrouter", apiKey, baseURL }).languageModel(model))
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

export const aiCredentialsSchema = z.object({
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

async function testConnection(input: TestConnectionInput): Promise<boolean> {
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
};

async function chat(input: ChatInput) {
	const model = getModel(input);
	const systemPrompt = buildChatSystemPrompt(input.resumeData);

	const result = streamText({
		model,
		system: systemPrompt,
		messages: await convertToModelMessages(input.messages),
		tools: {
			patch_resume: tool({
				description: patchResumeDescription,
				inputSchema: patchResumeInputSchema,
				execute: async ({ operations }) => executePatchResume(input.resumeData, operations),
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

export const aiService = {
	analyzeResume,
	chat,
	parseDocx,
	parsePdf,
	testConnection,
};
