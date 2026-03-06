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
import { match } from "ts-pattern";
import type { ZodError } from "zod";
import z, { flattenError } from "zod";
import { extractDocxText, extractPdfText } from "./ai.server";
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

const aiExtractionTemplate = {
	...defaultResumeData,
	basics: {
		...defaultResumeData.basics,
		customFields: [{ id: "", icon: "", text: "", link: "" }],
	},
	sections: {
		...defaultResumeData.sections,
		profiles: { ...defaultResumeData.sections.profiles, items: [{ id: "", hidden: false, icon: "", network: "", username: "", website: { url: "", label: "" } }] },
		experience: { ...defaultResumeData.sections.experience, items: [{ id: "", hidden: false, company: "", position: "", location: "", period: "", website: { url: "", label: "" }, description: "" }] },
		education: { ...defaultResumeData.sections.education, items: [{ id: "", hidden: false, school: "", degree: "", area: "", grade: "", location: "", period: "", website: { url: "", label: "" }, description: "" }] },
		projects: { ...defaultResumeData.sections.projects, items: [{ id: "", hidden: false, name: "", period: "", website: { url: "", label: "" }, description: "" }] },
		skills: { ...defaultResumeData.sections.skills, items: [{ id: "", hidden: false, icon: "", name: "", proficiency: "", level: 0, keywords: [] }] },
		languages: { ...defaultResumeData.sections.languages, items: [{ id: "", hidden: false, language: "", fluency: "", level: 0 }] },
		interests: { ...defaultResumeData.sections.interests, items: [{ id: "", hidden: false, icon: "", name: "", keywords: [] }] },
		awards: { ...defaultResumeData.sections.awards, items: [{ id: "", hidden: false, title: "", awarder: "", date: "", website: { url: "", label: "" }, description: "" }] },
		certifications: { ...defaultResumeData.sections.certifications, items: [{ id: "", hidden: false, title: "", issuer: "", date: "", website: { url: "", label: "" }, description: "" }] },
		publications: { ...defaultResumeData.sections.publications, items: [{ id: "", hidden: false, title: "", publisher: "", date: "", website: { url: "", label: "" }, description: "" }] },
		volunteer: { ...defaultResumeData.sections.volunteer, items: [{ id: "", hidden: false, organization: "", location: "", period: "", website: { url: "", label: "" }, description: "" }] },
		references: { ...defaultResumeData.sections.references, items: [{ id: "", hidden: false, name: "", position: "", website: { url: "", label: "" }, phone: "", description: "" }] },
	}
};

function isObject(item: any): boolean {
	return item && typeof item === "object" && !Array.isArray(item);
}

function mergeDefaults(target: any, source: any): any {
	if (!isObject(target) || !isObject(source)) {
		return source === undefined || source === null ? target : source;
	}

	const output = { ...target };
	for (const key of Object.keys(source)) {
		if (source[key] === undefined || source[key] === null) {
			continue;
		}
		if (isObject(source[key])) {
			if (!(key in target)) {
				Object.assign(output, { [key]: source[key] });
			} else {
				output[key] = mergeDefaults(target[key], source[key]);
			}
		} else {
			Object.assign(output, { [key]: source[key] });
		}
	}
	return output;
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

	let pdfText: string;
	try {
		pdfText = await extractPdfText(input.file.data);
	} catch (e: any) {
		console.error(`[AI Service] Failed to parse PDF locally:`, e.message);
		throw new Error("Failed to extract text from the provided PDF.");
	}

	let result;
	try {
		result = await generateText({
			model,
			messages: [
				{
					role: "system",
					content: pdfParserSystemPrompt + "\n\nIMPORTANT: You must return ONLY raw valid JSON. Do not return markdown, do not return explanations. Just the JSON object. Use the following JSON as a template and fill in the extracted values. For arrays, you MUST use the exact key names shown in the template (e.g. use 'description' instead of 'summary', 'website' instead of 'url'):\n\n" + JSON.stringify(aiExtractionTemplate, null, 2),
				},
				{
					role: "user",
					content: `${pdfParserUserPrompt}\n\n--- EXTRACTED RESUME TEXT ---\n${pdfText}\n--- END OF EXTRACTED TEXT ---`,
				},
			],
		});
	} catch (e: any) {
		console.error(`[AI Service] parsePdf Failed! Provider: ${input.provider}`);
		console.error(`[AI Service] Error message:`, e.message);
		console.error(`[AI Service] Full error object:`, JSON.stringify(e, null, 2));
		throw e;
	}

	let parsedJson: any;
	try {
        const responseText = result.text || "";
		let jsonString = responseText.match(/\{[\s\S]*\}|\[[\s\S]*\]/)?.[0] || responseText;
		
		// Clean up common LLM JSON artifacts
		jsonString = jsonString.replace(/,\s*([}\]])/g, "$1"); // Remove trailing commas
		jsonString = jsonString.replace(/[\u0000-\u0019]+/g, ""); // Remove control characters like \n \t in raw string 

		parsedJson = JSON.parse(jsonString);
	} catch (e: any) {
		console.error("[AI Service] Failed to parse AI JSON response:", result?.text?.substring(0, 1000) + "...");
		console.error("[AI Service] JSON Parse Error:", e.message);
		throw new Error("The AI returned malformed JSON data stream.");
	}

    const mergedData = mergeDefaults(defaultResumeData, parsedJson);

	try {
        return resumeDataSchema.parse({
            ...mergedData,
            customSections: [],
            picture: defaultResumeData.picture,
            metadata: defaultResumeData.metadata,
        });
    } catch (e: any) {
        if (e.errors) {
            console.error("[AI Service] Zod Validation Errors:", JSON.stringify(e.errors, null, 2));
        } else {
            console.error("[AI Service] Zod Validation Error:", e.message);
        }
        console.error("[AI Service] Merged Resume Data Dump:", JSON.stringify(mergedData, null, 2));
        throw e;
    }
}

type ParseDocxInput = z.infer<typeof aiCredentialsSchema> & {
	file: z.infer<typeof fileInputSchema>;
	mediaType: "application/msword" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
};

async function parseDocx(input: ParseDocxInput): Promise<ResumeData> {
	const model = getModel(input);

	let docxText: string;
	try {
		docxText = await extractDocxText(input.file.data);
	} catch (e: any) {
		console.error(`[AI Service] Failed to parse DOCX locally:`, e.message);
		throw new Error("Failed to extract text from the provided Word document.");
	}

	let result;
	try {
		result = await generateText({
			model,
			messages: [
				{
					role: "system",
					content: docxParserSystemPrompt + "\n\nIMPORTANT: You must return ONLY raw valid JSON. Do not return markdown, do not return explanations. Just the JSON object. Use the following JSON as a template and fill in the extracted values. For arrays, you MUST use the exact key names shown in the template (e.g. use 'description' instead of 'summary', 'website' instead of 'url'):\n\n" + JSON.stringify(aiExtractionTemplate, null, 2),
				},
				{
					role: "user",
					content: `${docxParserUserPrompt}\n\n--- EXTRACTED RESUME TEXT ---\n${docxText}\n--- END OF EXTRACTED TEXT ---`,
				},
			],
		});
	} catch (e: any) {
		console.error(`[AI Service] parseDocx Failed! Provider: ${input.provider}`);
		console.error(`[AI Service] Error message:`, e.message);
		console.error(`[AI Service] Full error object:`, JSON.stringify(e, null, 2));
		throw e;
	}

	let parsedJson: any;
	try {
        const responseText = result.text || "";
		let jsonString = responseText.match(/\{[\s\S]*\}|\[[\s\S]*\]/)?.[0] || responseText;
		
		// Clean up common LLM JSON artifacts
		jsonString = jsonString.replace(/,\s*([}\]])/g, "$1"); // Remove trailing commas
		jsonString = jsonString.replace(/[\u0000-\u0019]+/g, ""); // Remove control characters like \n \t in raw string 

		parsedJson = JSON.parse(jsonString);
	} catch (e: any) {
		console.error("[AI Service] Failed to parse AI JSON response:", result?.text?.substring(0, 1000) + "...");
		console.error("[AI Service] JSON Parse Error:", e.message);
		throw new Error("The AI returned malformed JSON data stream.");
	}

    const mergedData = mergeDefaults(defaultResumeData, parsedJson);

	return resumeDataSchema.parse({
		...mergedData,
		customSections: [],
		picture: defaultResumeData.picture,
		metadata: defaultResumeData.metadata,
	});
}

export function formatZodError(error: ZodError): string {
	return JSON.stringify(flattenError(error));
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
