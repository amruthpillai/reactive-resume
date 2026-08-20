import type { UIMessage } from "ai";
import { and, eq, max, sql } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import * as schema from "@reactive-resume/db/schema";

// Crash-safe incremental persistence for the assistant message of an agent run.
// A draft row is inserted before the stream starts, folded step-by-step in onStepEnd,
// and finalized (upserted) with the SDK's authoritative response message in onFinish.
// All functions take an injectable database so tests can stub queries without
// touching the send path's positional db mock.

type AgentMessagesDb = Pick<typeof db, "select" | "insert" | "update" | "delete">;

type UiMessagePart = UIMessage["parts"][number];

type StepContentPart = Record<string, unknown> & { type: string };

type AgentStepLike = { content: ReadonlyArray<unknown> };

function toolPartFromCall(part: StepContentPart): UiMessagePart {
	if (part.dynamic) {
		return {
			type: "dynamic-tool",
			toolName: String(part.toolName),
			toolCallId: String(part.toolCallId),
			state: "input-available",
			input: part.input,
		} as UiMessagePart;
	}

	return {
		type: `tool-${String(part.toolName)}`,
		toolCallId: String(part.toolCallId),
		state: "input-available",
		input: part.input,
	} as UiMessagePart;
}

// Pure fold: append one step's content (text, reasoning, tool call/result/error) to a UI message.
// Sources, files, and approval parts are skipped — the authoritative onFinish message carries them.
export function applyStepToUiMessage(message: UIMessage, step: AgentStepLike): UIMessage {
	const parts: UiMessagePart[] = [...message.parts, { type: "step-start" } as UiMessagePart];
	const toolPartIndexByCallId = new Map<string, number>();

	for (const rawContent of step.content) {
		if (!rawContent || typeof rawContent !== "object" || typeof (rawContent as { type?: unknown }).type !== "string") {
			continue;
		}
		const content = rawContent as StepContentPart;
		if (content.type === "text" && typeof content.text === "string" && content.text) {
			parts.push({ type: "text", text: content.text } as UiMessagePart);
			continue;
		}

		if (content.type === "reasoning" && typeof content.text === "string" && content.text) {
			parts.push({ type: "reasoning", text: content.text } as UiMessagePart);
			continue;
		}

		if (content.type === "tool-call" && typeof content.toolCallId === "string") {
			toolPartIndexByCallId.set(content.toolCallId, parts.length);
			parts.push(toolPartFromCall(content));
			continue;
		}

		if ((content.type === "tool-result" || content.type === "tool-error") && typeof content.toolCallId === "string") {
			const resolution =
				content.type === "tool-result"
					? { state: "output-available", output: content.output }
					: {
							state: "output-error",
							errorText: content.error instanceof Error ? content.error.message : String(content.error),
						};

			const index = toolPartIndexByCallId.get(content.toolCallId);
			if (index === undefined) {
				parts.push({ ...toolPartFromCall(content), ...resolution } as UiMessagePart);
			} else {
				parts[index] = { ...(parts[index] as Record<string, unknown>), ...resolution } as UiMessagePart;
			}
		}
	}

	return { ...message, parts };
}

async function nextMessageSequence(threadId: string, database: AgentMessagesDb) {
	const [row] = await database
		.select({ maxSequence: max(schema.agentMessage.sequence) })
		.from(schema.agentMessage)
		.where(eq(schema.agentMessage.threadId, threadId));

	return (row?.maxSequence ?? -1) + 1;
}

async function touchThread(input: { threadId: string; userId: string }, database: AgentMessagesDb) {
	await database
		.update(schema.agentThread)
		.set({ lastMessageAt: new Date() })
		.where(and(eq(schema.agentThread.id, input.threadId), eq(schema.agentThread.userId, input.userId)));
}

export async function insertDraftAssistantMessage(
	input: { userId: string; threadId: string; uiMessageId: string },
	database: AgentMessagesDb = db,
) {
	const sequence = await nextMessageSequence(input.threadId, database);
	const [row] = await database
		.insert(schema.agentMessage)
		.values({
			userId: input.userId,
			threadId: input.threadId,
			role: "assistant",
			status: "streaming",
			sequence,
			uiMessage: { id: input.uiMessageId, role: "assistant", parts: [] },
		})
		.returning({ id: schema.agentMessage.id });

	if (!row) throw new Error("AGENT_DRAFT_MESSAGE_CREATE_FAILED");

	await touchThread(input, database);

	return { rowId: row.id, sequence };
}

// Upsert by row id first, then by the uiMessage's embedded id (a question/approval continuation
// streams into the SAME uiMessage id as the stored assistant row), then insert as a last resort.
export async function upsertAssistantUiMessage(
	input: {
		userId: string;
		threadId: string;
		rowId?: string;
		message: UIMessage;
		status: "streaming" | "completed" | "canceled";
	},
	database: AgentMessagesDb = db,
) {
	const set = {
		status: input.status,
		uiMessage: input.message as unknown as Record<string, unknown>,
	};
	const isFinal = input.status !== "streaming";

	if (input.rowId) {
		const updated = await database
			.update(schema.agentMessage)
			.set(set)
			.where(
				and(
					eq(schema.agentMessage.id, input.rowId),
					eq(schema.agentMessage.threadId, input.threadId),
					eq(schema.agentMessage.userId, input.userId),
				),
			)
			.returning({ id: schema.agentMessage.id });

		if (updated.length === 1) {
			if (isFinal) await touchThread(input, database);
			// biome-ignore lint/style/noNonNullAssertion: length checked above
			return { rowId: updated[0]!.id };
		}
	}

	const updatedById = await database
		.update(schema.agentMessage)
		.set(set)
		.where(
			and(
				eq(schema.agentMessage.threadId, input.threadId),
				eq(schema.agentMessage.userId, input.userId),
				eq(schema.agentMessage.role, "assistant"),
				sql`${schema.agentMessage.uiMessage}->>'id' = ${input.message.id}`,
			),
		)
		.returning({ id: schema.agentMessage.id });

	if (updatedById.length >= 1) {
		if (isFinal) await touchThread(input, database);
		// biome-ignore lint/style/noNonNullAssertion: length checked above
		return { rowId: updatedById[0]!.id };
	}

	const sequence = await nextMessageSequence(input.threadId, database);
	const [inserted] = await database
		.insert(schema.agentMessage)
		.values({
			userId: input.userId,
			threadId: input.threadId,
			role: input.message.role,
			status: input.status,
			sequence,
			uiMessage: input.message as unknown as Record<string, unknown>,
		})
		.returning({ id: schema.agentMessage.id });

	if (!inserted) throw new Error("AGENT_MESSAGE_CREATE_FAILED");

	await touchThread(input, database);

	return { rowId: inserted.id };
}

// Removes a draft that never received content (sync failure before the stream produced anything).
export async function deleteDraftIfEmpty(
	input: { rowId: string; threadId: string; userId: string },
	database: AgentMessagesDb = db,
) {
	await database
		.delete(schema.agentMessage)
		.where(
			and(
				eq(schema.agentMessage.id, input.rowId),
				eq(schema.agentMessage.threadId, input.threadId),
				eq(schema.agentMessage.userId, input.userId),
				eq(schema.agentMessage.status, "streaming"),
				sql`jsonb_array_length(${schema.agentMessage.uiMessage}->'parts') = 0`,
			),
		);
}
