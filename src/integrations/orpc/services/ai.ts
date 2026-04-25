import type { ModelMessage } from "ai";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
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
import { jsonrepair } from "jsonrepair";
import { createOllama } from "ollama-ai-provider-v2";
import { match } from "ts-pattern";
import z, { flattenError, ZodError } from "zod";

import type { JobResult } from "@/schema/jobs";
import type { ResumeData } from "@/schema/resume/data";

import analyzeResumeSystemPromptTemplate from "@/integrations/ai/prompts/analyze-resume-system.md?raw";
import chatSystemPromptTemplate from "@/integrations/ai/prompts/chat-system.md?raw";
import docxParserSystemPrompt from "@/integrations/ai/prompts/docx-parser-system.md?raw";
import docxParserUserPrompt from "@/integrations/ai/prompts/docx-parser-user.md?raw";
import pdfParserSystemPrompt from "@/integrations/ai/prompts/pdf-parser-system.md?raw";
import pdfParserUserPrompt from "@/integrations/ai/prompts/pdf-parser-user.md?raw";
import tailorSystemPromptTemplate from "@/integrations/ai/prompts/tailor-system.md?raw";
import {
  executePatchResume,
  patchResumeDescription,
  patchResumeInputSchema,
} from "@/integrations/ai/tools/patch-resume";
import { aiProviderSchema, type AIProvider } from "@/integrations/ai/types";
import { resumeAnalysisSchema, type ResumeAnalysis } from "@/schema/resume/analysis";
import { defaultResumeData, resumeDataSchema } from "@/schema/resume/data";
import { tailorOutputSchema, type TailorOutput } from "@/schema/tailor";
import { buildAiExtractionTemplate } from "@/utils/ai-template";
import { env } from "@/utils/env";
import { isObject } from "@/utils/sanitize";
import { isAllowedExternalUrl, parseAllowedHostList } from "@/utils/url-security";

const aiExtractionTemplate = buildAiExtractionTemplate();

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
    console.error(`${context}:`, error);
    throw error;
  }

  console.error(`${context}:`, error);
  throw new Error(`An unknown error occurred during ${context}.`);
}

function getJsonBoundaryIndices(value: string): { first: number; last: number } {
  const firstCurly = value.indexOf("{");
  const firstSquare = value.indexOf("[");
  const lastCurly = value.lastIndexOf("}");
  const lastSquare = value.lastIndexOf("]");

  let first = -1;
  if (firstCurly !== -1 && firstSquare !== -1) {
    first = Math.min(firstCurly, firstSquare);
  } else {
    first = Math.max(firstCurly, firstSquare);
  }

  return { first, last: Math.max(lastCurly, lastSquare) };
}

function parseAndValidateResumeJson(resultText: string): ResumeData {
  let jsonString = resultText;
  const { first, last } = getJsonBoundaryIndices(jsonString);
  if (first !== -1 && last !== -1 && last >= first) {
    jsonString = jsonString.substring(first, last + 1);
  }

  try {
    const repairedJson = jsonrepair(jsonString);
    const parsedJson = JSON.parse(repairedJson);
    const mergedData = mergeDefaults(defaultResumeData, parsedJson);
    const normalizedData = normalizeResumeDataForSchema(mergedData);

    return resumeDataSchema.parse({
      ...normalizedData,
      customSections: [],
      picture: defaultResumeData.picture,
      metadata: defaultResumeData.metadata,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      console.error("Zod validation failed during resume parsing:", flattenError(error));
      throw error;
    }

    console.error("Unknown error during resume data validation:", error);
    throw new Error("An unknown error occurred while validating the merged resume data.");
  }
}

const sectionRequiredFieldMap = {
  profiles: "network",
  experience: "company",
  education: "school",
  projects: "name",
  skills: "name",
  languages: "language",
  interests: "name",
  awards: "title",
  certifications: "title",
  publications: "title",
  volunteer: "organization",
  references: "name",
} as const;

type SectionKey = keyof typeof sectionRequiredFieldMap;

function normalizeResumeDataForSchema(data: Record<string, unknown>) {
  if (!isObject(data)) return data;
  if (!isObject(data.sections)) return data;

  const normalizedSections: Record<string, unknown> = { ...data.sections };

  for (const sectionKey of Object.keys(sectionRequiredFieldMap) as SectionKey[]) {
    const section = normalizedSections[sectionKey];
    if (!isObject(section)) continue;
    if (!Array.isArray(section.items)) continue;

    const itemTemplate = aiExtractionTemplate.sections[sectionKey].items[0] as Record<string, unknown>;
    const requiredField = sectionRequiredFieldMap[sectionKey];

    const normalizedItems = section.items
      .filter((item): item is Record<string, unknown> => isObject(item))
      .map((item) => mergeDefaults(itemTemplate, item))
      .filter((item) => {
        const requiredValue = item[requiredField];
        if (typeof requiredValue !== "string") return false;
        return requiredValue.trim().length > 0;
      })
      .map((item) => {
        const normalizedItem = { ...item };
        if (typeof normalizedItem.id !== "string" || normalizedItem.id.trim().length === 0) {
          normalizedItem.id = crypto.randomUUID();
        }
        if (typeof normalizedItem.hidden !== "boolean") {
          normalizedItem.hidden = false;
        }
        return normalizedItem;
      });

    normalizedSections[sectionKey] = { ...section, items: normalizedItems };
  }

  return { ...data, sections: normalizedSections };
}

type GetModelInput = {
  provider: AIProvider;
  model: string;
  apiKey: string;
  baseURL?: string;
};

const MAX_AI_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_AI_FILE_BASE64_CHARS = Math.ceil((MAX_AI_FILE_BYTES * 4) / 3) + 4;
const adminAllowedBaseUrls = parseAllowedHostList(env.AI_ALLOWED_BASE_URLS);
const defaultProviderHosts: Record<Exclude<AIProvider, "ollama">, string[]> = {
  openai: ["api.openai.com"],
  anthropic: ["api.anthropic.com"],
  gemini: ["generativelanguage.googleapis.com"],
  "vercel-ai-gateway": ["gateway.ai.vercel.com"],
  openrouter: ["openrouter.ai"],
};

function resolveBaseUrl(input: GetModelInput): string {
  const baseURL = input.baseURL?.trim();

  if (!baseURL) throw new Error("INVALID_AI_BASE_URL");

  const providerHosts = input.provider === "ollama" ? [] : defaultProviderHosts[input.provider];
  const allowedHosts = new Set([...providerHosts, ...adminAllowedBaseUrls]);
  if (!isAllowedExternalUrl(baseURL, allowedHosts)) {
    throw new Error("INVALID_AI_BASE_URL");
  }

  return baseURL;
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
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      });

      return ollama.languageModel(model);
    })
    .exhaustive();
}

export const aiCredentialsSchema = z.object({
  provider: aiProviderSchema,
  model: z.string(),
  apiKey: z.string(),
  baseURL: z.string().optional().default(""),
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
      content:
        systemPrompt +
        "\n\nIMPORTANT: You must return ONLY raw valid JSON. Do not return markdown, do not return explanations. Just the JSON object. Use the following JSON as a template and fill in the extracted values. For arrays, you MUST use the exact key names shown in the template (e.g. use 'description' instead of 'summary', 'website' instead of 'url'):\n\n" +
        JSON.stringify(aiExtractionTemplate, null, 2),
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

function formatJobHighlights(highlights: Record<string, string[]> | null): string {
  if (!highlights) return "None provided.";
  return Object.entries(highlights)
    .map(([key, values]) => `${key}:\n${values.map((v) => `- ${v}`).join("\n")}`)
    .join("\n\n");
}

function buildTailorSystemPrompt(resumeData: ResumeData, job: JobResult): string {
  return tailorSystemPromptTemplate
    .replace("{{RESUME_DATA}}", JSON.stringify(resumeData, null, 2))
    .replace("{{JOB_TITLE}}", job.job_title)
    .replace("{{COMPANY}}", job.employer_name)
    .replace("{{JOB_DESCRIPTION}}", job.job_description || "No description provided.")
    .replace("{{JOB_HIGHLIGHTS}}", formatJobHighlights(job.job_highlights))
    .replace("{{JOB_SKILLS}}", (job.job_required_skills || []).join(", ") || "None specified.");
}

type TailorResumeInput = z.infer<typeof aiCredentialsSchema> & {
  resumeData: ResumeData;
  job: JobResult;
};

type AnalyzeResumeInput = z.infer<typeof aiCredentialsSchema> & {
  resumeData: ResumeData;
};

function buildAnalyzeResumeSystemPrompt(resumeData: ResumeData): string {
  return analyzeResumeSystemPromptTemplate + `\n\n## Resume Data\n\n${JSON.stringify(resumeData, null, 2)}`;
}

async function analyzeResume(input: AnalyzeResumeInput): Promise<ResumeAnalysis> {
  const model = getModel(input);
  const systemPrompt = buildAnalyzeResumeSystemPrompt(input.resumeData);

  const result = await generateText({
    model,
    output: Output.object({ schema: resumeAnalysisSchema }),
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

async function tailorResume(input: TailorResumeInput): Promise<TailorOutput> {
  const model = getModel(input);
  const systemPrompt = buildTailorSystemPrompt(input.resumeData, input.job);

  const result = await generateText({
    model,
    output: Output.object({ schema: tailorOutputSchema }),
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Please tailor this resume for the ${input.job.job_title} position at ${input.job.employer_name}. Optimize for ATS compatibility and relevance.`,
      },
    ],
  });

  if (result.output == null) {
    throw new Error("AI returned no structured tailoring output.");
  }

  return tailorOutputSchema.parse(result.output);
}

export const aiService = {
  analyzeResume,
  chat,
  parseDocx,
  parsePdf,
  tailorResume,
  testConnection,
};
