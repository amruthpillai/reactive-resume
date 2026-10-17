// The assistant's chat transport, ported from apps/web/src/features/assistant/chat.ts. It has no React Native imports,
// so the Node scenarios in reports/M6-T3 drive it with mocked event iterators.
import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";
import { eventIteratorToUnproxiedDataStream } from "@orpc/client";
import { parseJsonEventStream, uiMessageChunkSchema } from "ai";

/** What a message shares with the model; each context chip turns one off. The career coach uses the last four. */
export type MessageContext = {
	document: boolean;
	posting: boolean;
	applicationId?: string;
	application?: boolean;
	memory?: boolean;
	web?: boolean;
	tab?: "fit" | "apply" | "prepare" | "practise" | "debrief" | "messages" | "saved";
	offerIds?: string[];
};

type SendInput = {
	threadId: string;
	message: UIMessage;
	context: MessageContext;
	attachmentIds?: string[];
};

/** The two streaming procedures the transport needs (`streamClient.agent.messages`). */
export type AgentMessagesApi = {
	send: (input: SendInput, options: { signal?: AbortSignal }) => Promise<AsyncIterator<string>>;
	resume: (input: { threadId: string }, options: { signal?: AbortSignal }) => Promise<AsyncIterator<string>>;
};

/** SSE frames as UI message chunks; a malformed frame is dropped rather than ending the reply. */
function parseSse(stream: ReadableStream<string>): ReadableStream<UIMessageChunk> {
	return parseJsonEventStream({
		stream: stream.pipeThrough(new TextEncoderStream()),
		schema: uiMessageChunkSchema,
	}).pipeThrough(
		new TransformStream({
			transform(chunk, controller) {
				// Logs the error name only: a frame can carry the user's resume text.
				if (!chunk.success) return void console.warn("[assistant] dropping malformed SSE frame");
				controller.enqueue(chunk.value as UIMessageChunk);
			},
		}),
	);
}

const attachmentIdsOf = (body: object | undefined) =>
	body && "attachmentIds" in body && Array.isArray(body.attachmentIds)
		? body.attachmentIds.filter((id): id is string => typeof id === "string")
		: undefined;

type SendOptions = Parameters<ChatTransport<UIMessage>["sendMessages"]>[0];

/** Sends only the newest message (the server keeps the transcript) with the context chips as they are now. */
export async function sendAgentMessage(
	api: AgentMessagesApi,
	threadId: string,
	context: MessageContext,
	options: Pick<SendOptions, "messages" | "body" | "abortSignal">,
): Promise<ReadableStream<UIMessageChunk>> {
	const message = options.messages.at(-1);
	if (!message) throw new Error("No message to send.");
	const attachmentIds = attachmentIdsOf(options.body);
	const iterator = await api.send(
		{ threadId, message, context, ...(attachmentIds ? { attachmentIds } : {}) },
		options.abortSignal ? { signal: options.abortSignal } : {},
	);
	return parseSse(eventIteratorToUnproxiedDataStream(iterator));
}

/** A resumed stream that sends nothing for this long is treated as hung: it ends, and the chat reloads the thread. */
export const RESUME_IDLE_MS = 45_000;

type UIPart = UIMessage["parts"][number];

/**
 * The parts of an assistant message that came before the run now streaming. A run continues the message after the
 * user answers the assistant's question (the only client tool); the answer keeps the question's place, so parts the
 * earlier run wrote after the question stay before the boundary. Every run begins a step (`step-start`, in the SDK's
 * message and in the server's saved draft alike), so the current run starts at the first step after the last answer.
 * With no step of it there yet, the whole message came before it.
 */
export function partsBeforeRun(message: UIMessage | undefined): UIPart[] {
	if (message?.role !== "assistant") return [];
	const answered = message.parts.findLastIndex(
		(part) => part.type === "tool-ask_user_question" && (part as { state?: string }).state === "output-available",
	);
	const runStart = message.parts.findIndex((part, index) => index > answered && part.type === "step-start");
	return runStart === -1 ? message.parts : message.parts.slice(0, runStart);
}

/** Chunks that rebuild completed parts, so a replay that restarts the message keeps what came before the run. */
function chunksFor(parts: readonly UIPart[]): UIMessageChunk[] {
	return parts.flatMap((part, index): UIMessageChunk[] => {
		const id = `before-run-${index}`;
		if (part.type === "step-start") return [{ type: "start-step" }];
		if (part.type === "text")
			return [
				{ type: "text-start", id },
				{ type: "text-delta", id, delta: part.text },
				{ type: "text-end", id },
			];
		if (part.type === "reasoning")
			return [
				{ type: "reasoning-start", id },
				{ type: "reasoning-delta", id, delta: part.text },
				{ type: "reasoning-end", id },
			];
		if (part.type === "source-url")
			return [
				{ type: "source-url", sourceId: part.sourceId, url: part.url, ...(part.title ? { title: part.title } : {}) },
			];
		if (part.type === "file") return [{ type: "file", url: part.url, mediaType: part.mediaType }];
		if (!part.type.startsWith("tool-")) return [];
		const tool = part as { toolCallId: string; state?: string; input?: unknown; output?: unknown; errorText?: string };
		const toolName = part.type.slice("tool-".length);
		const input: UIMessageChunk = {
			type: "tool-input-available",
			toolCallId: tool.toolCallId,
			toolName,
			input: tool.input,
		};
		if (tool.state === "output-available")
			return [input, { type: "tool-output-available", toolCallId: tool.toolCallId, output: tool.output }];
		if (tool.state === "output-error")
			return [input, { type: "tool-output-error", toolCallId: tool.toolCallId, errorText: tool.errorText ?? "" }];
		return [input];
	});
}

type ResumeOptions = {
	signal?: AbortSignal | undefined;
	/** The message a replayed `start` names, to keep its parts from before the run. */
	messageById: (id: string) => UIMessage | undefined;
	idleMs?: number;
};

/**
 * Picks a running reply up again. The server replays the run from its start, and the chat (`resumeStreamIsReplay`)
 * restarts the message, so the parts from before the run are rebuilt first. A stream that goes quiet for `idleMs`
 * is cancelled and ends, rather than spinning forever on a run the server lost.
 */
export async function resumeAgentStream(api: AgentMessagesApi, threadId: string, options: ResumeOptions) {
	const controller = new AbortController();
	const abort = () => controller.abort();
	if (options.signal?.aborted) abort();
	options.signal?.addEventListener("abort", abort, { once: true });
	const iterator = await api.resume({ threadId }, { signal: controller.signal });
	const idleMs = options.idleMs ?? RESUME_IDLE_MS;
	let timer: ReturnType<typeof setTimeout> | undefined;
	const quiet = () =>
		new Promise<IteratorResult<string>>((resolve) => {
			timer = setTimeout(() => {
				abort();
				void iterator.return?.();
				resolve({ done: true, value: undefined });
			}, idleMs);
		});
	const watched: AsyncIterator<string> = {
		next: async () => {
			try {
				return await Promise.race([iterator.next(), quiet()]);
			} finally {
				clearTimeout(timer);
			}
		},
		return: async () => {
			clearTimeout(timer);
			options.signal?.removeEventListener("abort", abort);
			return (await iterator.return?.()) ?? { done: true, value: undefined };
		},
	};
	let first = true;
	return parseSse(eventIteratorToUnproxiedDataStream(watched)).pipeThrough(
		new TransformStream<UIMessageChunk, UIMessageChunk>({
			transform(chunk, stream) {
				stream.enqueue(chunk);
				if (chunk.type !== "start" || !first) return;
				first = false;
				const before = chunk.messageId ? partsBeforeRun(options.messageById(chunk.messageId)) : [];
				for (const rebuilt of chunksFor(before)) stream.enqueue(rebuilt);
			},
			flush() {
				options.signal?.removeEventListener("abort", abort);
			},
		}),
	);
}
