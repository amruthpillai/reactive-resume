// Shared typed contracts for the /agent workspace tools. Zod is the only runtime import — the
// "ai" package is a devDependency used with `import type` only, so this file stays
// runtime-universal (consumed by both the API tool definitions and the web chat UI).
import type { UIDataTypes, UIMessage } from "ai";
import z from "zod";
import { jsonPatchOperationSchema } from "@reactive-resume/resume/patch";

export const askUserQuestionInputSchema = z.object({
	question: z.string().trim().min(1),
	choices: z.array(z.string().trim().min(1)).min(1).max(4).optional(),
	recommendedChoice: z.string().trim().optional(),
});

export const applyResumePatchInputSchema = z.object({
	title: z.string().trim().min(1),
	summary: z.string().trim().optional(),
	operations: z.array(jsonPatchOperationSchema).min(1),
});

// Loose on purpose: legacy persisted outputs predate changedPaths/resume.
export const applyResumePatchOutputSchema = z.looseObject({
	actionId: z.string(),
	resumeId: z.string(),
	title: z.string(),
	summary: z.string().nullish(),
	operations: z.array(jsonPatchOperationSchema),
	appliedUpdatedAt: z.string(),
	changedPaths: z.array(z.string()).optional(),
	resume: z.unknown().optional(),
});

// All-optional and loose: legacy rows have no metadata and must keep rendering.
export const agentMessageMetadataSchema = z
	.looseObject({
		model: z.string().optional(),
		usage: z
			.looseObject({
				inputTokens: z.number().optional(),
				outputTokens: z.number().optional(),
				totalTokens: z.number().optional(),
				reasoningTokens: z.number().optional(),
				cachedInputTokens: z.number().optional(),
			})
			.optional(),
	})
	.optional();

export type AskUserQuestionInput = z.infer<typeof askUserQuestionInputSchema>;
export type ApplyResumePatchInput = z.infer<typeof applyResumePatchInputSchema>;
export type ApplyResumePatchOutput = z.infer<typeof applyResumePatchOutputSchema>;
export type AgentMessageMetadata = z.infer<typeof agentMessageMetadataSchema>;

export type AgentTools = {
	ask_user_question: { input: AskUserQuestionInput; output: string };
	read_resume: { input: Record<string, never>; output: unknown };
	read_attachment: { input: { attachmentId: string }; output: unknown };
	apply_resume_patch: { input: ApplyResumePatchInput; output: ApplyResumePatchOutput };
	// Provider-native web search (OpenAI Responses); input/output shapes are provider-owned.
	web_search: { input: unknown; output: unknown };
};

export type AgentUIMessage = UIMessage<AgentMessageMetadata, UIDataTypes, AgentTools>;
