import type { AIProvider } from "@reactive-resume/ai/types";
import type { ToolSet } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { tool } from "ai";
import z from "zod";
import { jsonPatchOperationSchema } from "@reactive-resume/utils/resume/patch";
import { supportsProviderNativeWebSearch } from "./ai-capabilities";

type AgentProviderConfig = {
	provider: AIProvider;
	model: string;
	apiKey: string;
	baseURL?: string | null;
};

export const applyResumePatchToolInputSchema = z.object({
	title: z.string().trim().min(1),
	summary: z.string().trim().optional(),
	operations: z.array(jsonPatchOperationSchema).min(1),
});

type ApplyResumePatchToolInput = z.infer<typeof applyResumePatchToolInputSchema>;

type BuildAgentToolsInput = {
	provider: AgentProviderConfig;
	handlers: {
		fetchUrl: (url: string) => Promise<unknown>;
		readResume: () => Promise<unknown>;
		readAttachment: (attachmentId: string) => Promise<unknown>;
		applyResumePatch: (input: ApplyResumePatchToolInput) => Promise<unknown>;
	};
};

export function buildProviderNativeAgentTools(provider: AgentProviderConfig): ToolSet {
	if (!supportsProviderNativeWebSearch(provider)) return {};

	const openai = createOpenAI({
		apiKey: provider.apiKey,
		...(provider.baseURL ? { baseURL: provider.baseURL } : {}),
	});

	// Defensive runtime check: older `@ai-sdk/openai` versions and some OpenAI-compatible
	// gateways don't expose tools.webSearch. supportsProviderNativeWebSearch() filters out
	// non-OpenAI providers, but this guards against SDK-shape drift on the OpenAI path.
	if (typeof openai.tools.webSearch !== "function") return {};

	return {
		web_search: openai.tools.webSearch({
			searchContextSize: "low",
		}),
	};
}

export function buildAgentInstructions({ hasProviderNativeSearch }: { hasProviderNativeSearch: boolean }) {
	const baseInstructions =
		"You are an expert resume-writing agent inside Reactive Resume. Help the user improve the working resume for a target role. Read the resume before editing. Respond to the user in clean Markdown with concise paragraphs, bullets, and bold text when it improves scanability. Apply concise, valid JSON Patch operations when changes are useful. Patch paths are evaluated against the resume data object returned by read_resume, so use paths like /basics/name for the visible name and never /data/basics/name or /name. apply_resume_patch cannot rename the resume file/title metadata. Batch related JSON Patch operations into one apply_resume_patch call for each coherent edit instead of making repeated patch calls for the same request. Ask the user a question when a missing preference blocks a high-confidence edit.";

	if (!hasProviderNativeSearch) {
		return `${baseInstructions} Use fetch_url for user-provided public HTTPS URLs, exact pages, public job descriptions, or company pages.`;
	}

	return `${baseInstructions} Use web_search for open-ended or current web research, such as finding recent company, industry, or role context. Use fetch_url for user-provided public HTTPS URLs, exact pages, public job descriptions, or company pages.`;
}

export function buildAgentTools(input: BuildAgentToolsInput): ToolSet {
	return {
		...buildProviderNativeAgentTools(input.provider),
		ask_user_question: tool({
			description:
				"Ask the user a short question when you need a preference, missing fact, or choice before continuing. Provide 2-4 recommended answer choices when possible.",
			inputSchema: z.object({
				question: z.string().trim().min(1),
				choices: z.array(z.string().trim().min(1)).min(1).max(4).optional(),
				recommendedChoice: z.string().trim().optional(),
			}),
		}),
		fetch_url: tool({
			description:
				"Fetch readable text from a public HTTPS URL, such as a job description. Private, local, and non-HTTPS URLs are blocked.",
			inputSchema: z.object({ url: z.string().url() }),
			execute: ({ url }) => input.handlers.fetchUrl(url),
		}),
		read_resume: tool({
			description: "Read the current working resume JSON and metadata.",
			inputSchema: z.object({}),
			execute: input.handlers.readResume,
		}),
		read_attachment: tool({
			description:
				"Read a message attachment by id. Text, Markdown, and JSON attachments include content; images and supported files may already be provided directly to the model.",
			inputSchema: z.object({ attachmentId: z.string().trim().min(1) }),
			execute: ({ attachmentId }) => input.handlers.readAttachment(attachmentId),
		}),
		apply_resume_patch: tool({
			description:
				"Apply one cohesive batch of JSON Patch operations to the working resume data immediately. Paths are rooted at resume data; use /basics/name for the visible resume name, not /data/basics/name or /name. This tool cannot rename the resume file/title metadata. The user can revert the action later.",
			inputSchema: applyResumePatchToolInputSchema,
			execute: (toolInput) => input.handlers.applyResumePatch(toolInput),
		}),
	};
}
