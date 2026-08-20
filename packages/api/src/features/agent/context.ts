import type { ModelMessage } from "ai";
import { pruneMessages } from "ai";

// Pure model-context pruning, wired into the agent loop via prepareStep so it runs before every
// step. Tier 0 always runs (a stale resume snapshot is actively harmful — shifted array indexes);
// the remaining tiers only fire once the estimated token count exceeds the budget.

const AGENT_CONTEXT_TOKEN_BUDGET = 40_000;

const SNAPSHOT_TOOL_NAMES = new Set(["read_resume", "apply_resume_patch"]);
const SUPERSEDED_SNAPSHOT_NOTE =
	"Superseded resume snapshot removed. Base further edits on the resume state in the latest read_resume or apply_resume_patch result.";
const PRUNED_TOOL_RESULT_NOTE = "Older tool result pruned to fit the context budget.";
const PRUNED_ATTACHMENT_NOTE =
	"Attachment content removed to fit the context budget. Text, Markdown, and JSON attachments can be re-read with the read_attachment tool using their attachmentId from the conversation.";

type LoosePart = Record<string, unknown> & { type: string };

export function estimateTokenCount(value: unknown): number {
	const text = typeof value === "string" ? value : JSON.stringify(value);
	return Math.ceil((text?.length ?? 0) / 4);
}

function contentParts(message: ModelMessage): LoosePart[] {
	return Array.isArray(message.content) ? (message.content as unknown as LoosePart[]) : [];
}

function unwrapToolOutput(output: unknown): unknown {
	if (output && typeof output === "object" && "type" in output && "value" in output) {
		return (output as { value: unknown }).value;
	}
	return output;
}

function wrapToolOutput(original: unknown, value: unknown): unknown {
	if (original && typeof original === "object" && "type" in original && "value" in original) {
		return { ...(original as Record<string, unknown>), type: "json", value };
	}
	return value;
}

function isSnapshotResultPart(part: LoosePart): boolean {
	if (part.type !== "tool-result" || typeof part.toolName !== "string" || !SNAPSHOT_TOOL_NAMES.has(part.toolName)) {
		return false;
	}

	const value = unwrapToolOutput(part.output);
	if (!value || typeof value !== "object") return false;

	return part.toolName === "read_resume" ? "data" in value : "resume" in value;
}

function supersedeSnapshotPart(part: LoosePart): LoosePart {
	const value = unwrapToolOutput(part.output);
	const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
	const { data: _data, resume: _resume, ...rest } = record;

	return { ...part, output: wrapToolOutput(part.output, { ...rest, note: SUPERSEDED_SNAPSHOT_NOTE }) };
}

// Tier 0: exactly one full resume snapshot survives — the last one, positioned where the model
// last acted. Runs regardless of budget.
function supersedeStaleSnapshots(messages: ModelMessage[]): ModelMessage[] {
	const locations: Array<{ messageIndex: number; partIndex: number }> = [];

	for (const [messageIndex, message] of messages.entries()) {
		for (const [partIndex, part] of contentParts(message).entries()) {
			if (isSnapshotResultPart(part)) locations.push({ messageIndex, partIndex });
		}
	}

	if (locations.length <= 1) return messages;

	const stale = locations.slice(0, -1);
	const next = [...messages];
	for (const { messageIndex, partIndex } of stale) {
		const message = next[messageIndex] as ModelMessage & { content: LoosePart[] };
		const parts = [...contentParts(message)];
		// biome-ignore lint/style/noNonNullAssertion: location was collected from this array
		parts[partIndex] = supersedeSnapshotPart(parts[partIndex]!);
		next[messageIndex] = { ...message, content: parts } as ModelMessage;
	}

	return next;
}

function hasApprovalContent(message: ModelMessage): boolean {
	return contentParts(message).some(
		(part) => part.type === "tool-approval-request" || part.type === "tool-approval-response",
	);
}

function lastIndexWhere<T>(items: T[], predicate: (item: T) => boolean): number {
	for (let index = items.length - 1; index >= 0; index--) {
		// biome-ignore lint/style/noNonNullAssertion: index is in range
		if (predicate(items[index]!)) return index;
	}
	return -1;
}

// Tier 2: collapse the oldest tool call/result pairs into stubs — always both sides of a pair
// (several BYOK gateways reject unpaired tool messages), never the protected regions.
function collapseOldestToolPairs(messages: ModelMessage[], budget: number): ModelMessage[] {
	const lastAssistantIndex = lastIndexWhere(messages, (message) => message.role === "assistant");
	const survivingSnapshotCallIds = new Set<string>();

	// The surviving snapshot (last one, by Tier 0) must keep its full pair.
	for (let index = messages.length - 1; index >= 0; index--) {
		// biome-ignore lint/style/noNonNullAssertion: index is in range
		const part = contentParts(messages[index]!).findLast(isSnapshotResultPart);
		if (part && typeof part.toolCallId === "string") {
			survivingSnapshotCallIds.add(part.toolCallId);
			break;
		}
	}

	const resolvedCallIds = new Set<string>();
	for (const message of messages) {
		for (const part of contentParts(message)) {
			if (part.type === "tool-result" && typeof part.toolCallId === "string") resolvedCallIds.add(part.toolCallId);
		}
	}

	const next = [...messages];
	const stubbedCallIds = new Set<string>();
	let changed = false;

	for (const [index, message] of next.entries()) {
		if (estimateTokenCount(next) <= budget) break;
		if (index === lastAssistantIndex || hasApprovalContent(message)) continue;
		if (message.role !== "assistant" && message.role !== "tool") continue;

		const parts = contentParts(message).map((part) => {
			const toolCallId = typeof part.toolCallId === "string" ? part.toolCallId : null;
			if (!toolCallId || survivingSnapshotCallIds.has(toolCallId)) return part;

			if (part.type === "tool-call" && resolvedCallIds.has(toolCallId)) {
				stubbedCallIds.add(toolCallId);
				return { ...part, input: {} };
			}

			if (part.type === "tool-result" && stubbedCallIds.has(toolCallId)) {
				return { ...part, output: wrapToolOutput(part.output, { note: PRUNED_TOOL_RESULT_NOTE }) };
			}

			return part;
		});

		if (parts.some((part, partIndex) => part !== contentParts(message)[partIndex])) {
			next[index] = { ...message, content: parts } as ModelMessage;
			changed = true;
		}
	}

	return changed ? next : messages;
}

// Tier 3: attachment parts on non-latest user messages become recovery-path stubs.
function stubOlderAttachments(messages: ModelMessage[]): ModelMessage[] {
	const lastUserIndex = lastIndexWhere(messages, (message) => message.role === "user");
	const next = [...messages];
	let changed = false;

	for (const [index, message] of next.entries()) {
		if (message.role !== "user" || index === lastUserIndex || !Array.isArray(message.content)) continue;

		const parts = contentParts(message).map((part) =>
			part.type === "image" || part.type === "file" ? { type: "text", text: PRUNED_ATTACHMENT_NOTE } : part,
		);

		if (parts.some((part, partIndex) => part !== contentParts(message)[partIndex])) {
			next[index] = { ...message, content: parts } as unknown as ModelMessage;
			changed = true;
		}
	}

	return changed ? next : messages;
}

export function pruneAgentModelContext(
	messages: ModelMessage[],
	budget: number = AGENT_CONTEXT_TOKEN_BUDGET,
): ModelMessage[] {
	let current = supersedeStaleSnapshots(messages);
	if (estimateTokenCount(current) <= budget) return current;

	// Tier 1: strip reasoning from all but the last assistant message.
	const withoutReasoning = pruneMessages({ messages: current, reasoning: "before-last-message" });
	if (estimateTokenCount(withoutReasoning) < estimateTokenCount(current)) current = withoutReasoning;
	if (estimateTokenCount(current) <= budget) return current;

	current = collapseOldestToolPairs(current, budget);
	if (estimateTokenCount(current) <= budget) return current;

	return stubOlderAttachments(current);
}
