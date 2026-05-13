import type { UIMessageChunk } from "ai";
import type { ResumableStreamContext } from "resumable-stream/ioredis";
import { JsonToSseTransformStream } from "ai";
import { createResumableStreamContext } from "resumable-stream/ioredis";

type AgentStreamContext = Pick<ResumableStreamContext, "createNewResumableStream" | "resumeExistingStream">;

type AgentStreamLifecycleOptions = {
	getContext: () => AgentStreamContext;
};

let streamContext: AgentStreamContext | null = null;

export function emptyAgentStream() {
	return new ReadableStream<string>({
		start(controller) {
			controller.close();
		},
	});
}

function getAgentStreamContext() {
	streamContext ??= createResumableStreamContext({
		keyPrefix: "reactive-resume:agent-stream",
		waitUntil: null,
	});

	return streamContext;
}

export function createAgentStreamLifecycle(options: AgentStreamLifecycleOptions) {
	return {
		async create(streamId: string, makeStream: () => ReadableStream<UIMessageChunk>) {
			const stream = await options
				.getContext()
				.createNewResumableStream(streamId, () => makeStream().pipeThrough(new JsonToSseTransformStream()));

			return stream ?? emptyAgentStream();
		},

		async resume(streamId: string | null | undefined) {
			if (!streamId) return emptyAgentStream();

			const stream = await options.getContext().resumeExistingStream(streamId);
			return stream ?? emptyAgentStream();
		},
	};
}

export const agentStreamLifecycle = createAgentStreamLifecycle({ getContext: getAgentStreamContext });
