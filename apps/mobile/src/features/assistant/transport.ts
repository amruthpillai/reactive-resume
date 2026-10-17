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
	resume: (input: { threadId: string }) => Promise<AsyncIterator<string>>;
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

/** Picks a running reply up again, from wherever the server's stream is. */
export async function resumeAgentStream(api: AgentMessagesApi, threadId: string) {
	return parseSse(eventIteratorToUnproxiedDataStream(await api.resume({ threadId })));
}
