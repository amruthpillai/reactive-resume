import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { streamToEventIterator } from "@orpc/server";
import {
	convertToModelMessages,
	createGateway,
	generateText,
	Output,
	stepCountIs,
	streamText,
	tool,
	type UIMessage,
} from "ai";
import { createOllama } from "ai-sdk-ollama";
import { jsonrepair } from "jsonrepair";
import { match } from "ts-pattern";
import z, { flattenError, ZodError } from "zod";
import chatSystemPromptTemplate from "@/integrations/ai/prompts/chat-system.md?raw";
import docxParserSystemPrompt from "@/integrations/ai/prompts/docx-parser-system.md?raw";
import docxParserUserPrompt from "@/integrations/ai/prompts/docx-parser-user.md?raw";
import pdfParserSystemPrompt from "@/integrations/ai/prompts/pdf-parser-system.md?raw";
import pdfParserUserPrompt from "@/integrations/ai/prompts/pdf-parser-user.md?raw";
import {
	executePatchResume,
	patchResumeDescription,
	patchResumeInputSchema,
} from "@/integrations/ai/tools/patch-resume";
import type { ResumeData } from "@/schema/resume/data";
import { defaultResumeData, resumeDataSchema } from "@/schema/resume/data";
import { isObject } from "@/utils/sanitize";
import { extractDocxText, extractPdfText } from "./ai.server";

const aiExtractionTemplate = {
	...defaultResumeData,
	basics: {
		...defaultResumeData.basics,
		customFields: [{ id: "", icon: "", text: "", link: "" }],
	},
	sections: {
		...defaultResumeData.sections,
		profiles: {
			...defaultResumeData.sections.profiles,
			items: [{ id: "", hidden: false, icon: "", network: "", username: "", website: { url: "", label: "" } }],
		},
		experience: {
			...defaultResumeData.sections.experience,
			items: [
				{
					id: "",
					hidden: false,
					company: "",
					position: "",
					location: "",
					period: "",
					website: { url: "", label: "" },
					description: "",
				},
			],
		},
		education: {
			...defaultResumeData.sections.education,
			items: [
				{
					id: "",
					hidden: false,
					school: "",
					degree: "",
					area: "",
					grade: "",
					location: "",
					period: "",
					website: { url: "", label: "" },
					description: "",
				},
			],
		},
		projects: {
			...defaultResumeData.sections.projects,
			items: [{ id: "", hidden: false, name: "", period: "", website: { url: "", label: "" }, description: "" }],
		},
		skills: {
			...defaultResumeData.sections.skills,
			items: [{ id: "", hidden: false, icon: "", name: "", proficiency: "", level: 0, keywords: [] }],
		},
		languages: {
			...defaultResumeData.sections.languages,
			items: [{ id: "", hidden: false, language: "", fluency: "", level: 0 }],
		},
		interests: {
			...defaultResumeData.sections.interests,
			items: [{ id: "", hidden: false, icon: "", name: "", keywords: [] }],
		},
		awards: {
			...defaultResumeData.sections.awards,
			items: [
				{ id: "", hidden: false, title: "", awarder: "", date: "", website: { url: "", label: "" }, description: "" },
			],
		},
		certifications: {
			...defaultResumeData.sections.certifications,
			items: [
				{ id: "", hidden: false, title: "", issuer: "", date: "", website: { url: "", label: "" }, description: "" },
			],
		},
		publications: {
			...defaultResumeData.sections.publications,
			items: [
				{ id: "", hidden: false, title: "", publisher: "", date: "", website: { url: "", label: "" }, description: "" },
			],
		},
		volunteer: {
			...defaultResumeData.sections.volunteer,
			items: [
				{
					id: "",
					hidden: false,
					organization: "",
					location: "",
					period: "",
					website: { url: "", label: "" },
					description: "",
				},
			],
		},
		references: {
			...defaultResumeData.sections.references,
			items: [
				{ id: "", hidden: false, name: "", position: "", website: { url: "", label: "" }, phone: "", description: "" },
			],
		},
	},
};

/**
 * Merges two objects recursively, filling in missing properties in the target object
 * with values from the source object, but does not overwrite existing properties in the target
 * unless the source provides a defined, non-null value.
 *
 * Both target and source must be plain objects (Record<string, unknown>).
 * This function does not mutate either argument; returns a new object.
 *
 * @param target - The object to merge into (existing values take precedence)
 * @param source - The object providing default values
 * @returns The merged object
 */
function mergeDefaults<T extends Record<string, unknown>, S extends Record<string, unknown>>(
	target: T,
	source: S,
): T & S {
	if (!isObject(target) || !isObject(source)) {
		// Use source value if defined (non-null, non-undefined), else fallback to target
		return (source !== undefined && source !== null ? source : target) as T & S;
	}

	const output: Record<string, unknown> = { ...target };

	for (const key of Object.keys(source)) {
		const sourceValue = source[key];
		if (sourceValue === undefined || sourceValue === null) {
			continue;
		}
		const targetValue = target[key];

		if (isObject(sourceValue) && isObject(targetValue)) {
			output[key] = mergeDefaults(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>);
		} else if (isObject(sourceValue) && (targetValue === undefined || targetValue === null)) {
			// Fill with source object only if target does not have it
			output[key] = sourceValue;
		} else if (!isObject(sourceValue)) {
			output[key] = sourceValue;
		} else if (targetValue === undefined) {
			output[key] = sourceValue;
		}
	}

	return output as T & S;
}

function logAndRethrow(context: string, error: unknown): never {
	if (error instanceof Error) {
		console.error(`${context}:`, error.message);
		throw error;
	}
	console.error(`Unknown error in ${context}:`, error);
	throw new Error(`An unknown error occurred during ${context}.`);
}

function parseAndValidateResumeJson(resultText: string): ResumeData {
	let jsonString = resultText;
	const firstCurly = jsonString.indexOf("{");
	const firstSquare = jsonString.indexOf("[");
	const lastCurly = jsonString.lastIndexOf("}");
	const lastSquare = jsonString.lastIndexOf("]");

	let firstIndex = -1;
	if (firstCurly !== -1 && firstSquare !== -1) {
		firstIndex = Math.min(firstCurly, firstSquare);
	} else {
		firstIndex = Math.max(firstCurly, firstSquare);
	}
	const lastIndex = Math.max(lastCurly, lastSquare);

	if (firstIndex !== -1 && lastIndex !== -1 && lastIndex >= firstIndex) {
		jsonString = jsonString.substring(firstIndex, lastIndex + 1);
	}

	try {
		const repairedJson = jsonrepair(jsonString);
		const parsedJson = JSON.parse(repairedJson);
		const mergedData = mergeDefaults(defaultResumeData, parsedJson);

		return resumeDataSchema.parse({
			...mergedData,
			customSections: [],
			picture: defaultResumeData.picture,
			metadata: defaultResumeData.metadata,
		});
	} catch (error: unknown) {
		if (error instanceof ZodError) {
			console.error("Zod Validation Errors:", JSON.stringify(flattenError(error), null, 2));
			throw error;
		}

		console.error("Unknown error:", error);
		throw new Error("An unknown error occurred while validating the merged resume data.");
	}
}

export const aiProviderSchema = z.enum(["ollama", "openai", "gemini", "anthropic", "vercel-ai-gateway"]);

type AIProvider = z.infer<typeof aiProviderSchema>;

type GetModelInput = {
	provider: AIProvider;
	model: string;
	apiKey: string;
	baseURL: string;
};

const MAX_AI_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_AI_FILE_BASE64_CHARS = Math.ceil((MAX_AI_FILE_BYTES * 4) / 3) + 4;

function getModel(input: GetModelInput) {
	const { provider, model, apiKey } = input;
	const baseURL = input.baseURL || undefined;

	return match(provider)
		.with("openai", () => createOpenAI({ apiKey, baseURL }).languageModel(model))
		.with("ollama", () => createOllama({ apiKey, baseURL }).languageModel(model))
		.with("anthropic", () => createAnthropic({ apiKey, baseURL }).languageModel(model))
		.with("vercel-ai-gateway", () => createGateway({ apiKey, baseURL }).languageModel(model))
		.with("gemini", () => createGoogleGenerativeAI({ apiKey, baseURL }).languageModel(model))
		.exhaustive();
}

export const aiCredentialsSchema = z.object({
	provider: aiProviderSchema,
	model: z.string(),
	apiKey: z.string(),
	baseURL: z.string(),
});

export const fileInputSchema = z.object({
	name: z.string(),
	data: z.string().max(MAX_AI_FILE_BASE64_CHARS, "File is too large. Maximum size is 10MB."), // base64 encoded
});

type TestConnectionInput = z.infer<typeof aiCredentialsSchema>;

async function testConnection(input: TestConnectionInput): Promise<boolean> {
	const RESPONSE_OK = "1";

	const result = await generateText({
		model: getModel(input),
		output: Output.choice({ options: [RESPONSE_OK] }),
		messages: [{ role: "user", content: `Respond with "${RESPONSE_OK}"` }],
	});

	return result.output === RESPONSE_OK;
}

type ParsePdfInput = z.infer<typeof aiCredentialsSchema> & {
	file: z.infer<typeof fileInputSchema>;
};

async function parsePdf(input: ParsePdfInput): Promise<ResumeData> {
	const model = getModel(input);

	const pdfText = await extractPdfText(input.file.data).catch((error: unknown) =>
		logAndRethrow("Failed to parse PDF locally", error),
	);

	const result = await generateText({
		model,
		messages: [
			{
				role: "system",
				content:
					pdfParserSystemPrompt +
					"\n\nIMPORTANT: You must return ONLY raw valid JSON. Do not return markdown, do not return explanations. Just the JSON object. Use the following JSON as a template and fill in the extracted values. For arrays, you MUST use the exact key names shown in the template (e.g. use 'description' instead of 'summary', 'website' instead of 'url'):\n\n" +
					JSON.stringify(aiExtractionTemplate, null, 2),
			},
			{
				role: "user",
				content: `${pdfParserUserPrompt}\n\n--- EXTRACTED RESUME TEXT ---\n${pdfText}\n--- END OF EXTRACTED TEXT ---`,
			},
		],
	}).catch((error: unknown) => logAndRethrow("Failed to generate the text with the model", error));

	return parseAndValidateResumeJson(result.text);
}

type ParseDocxInput = z.infer<typeof aiCredentialsSchema> & {
	file: z.infer<typeof fileInputSchema>;
	mediaType: "application/msword" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
};

async function parseDocx(input: ParseDocxInput): Promise<ResumeData> {
	const model = getModel(input);

	const docxText = await extractDocxText(input.file.data).catch((error: unknown) =>
		logAndRethrow("Failed to parse DOCX locally", error),
	);

	const result = await generateText({
		model,
		messages: [
			{
				role: "system",
				content:
					docxParserSystemPrompt +
					"\n\nIMPORTANT: You must return ONLY raw valid JSON. Do not return markdown, do not return explanations. Just the JSON object. Use the following JSON as a template and fill in the extracted values. For arrays, you MUST use the exact key names shown in the template (e.g. use 'description' instead of 'summary', 'website' instead of 'url'):\n\n" +
					JSON.stringify(aiExtractionTemplate, null, 2),
			},
			{
				role: "user",
				content: `${docxParserUserPrompt}\n\n--- EXTRACTED RESUME TEXT ---\n${docxText}\n--- END OF EXTRACTED TEXT ---`,
			},
		],
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

export const aiService = {
	testConnection,
	parsePdf,
	parseDocx,
	chat,
};
