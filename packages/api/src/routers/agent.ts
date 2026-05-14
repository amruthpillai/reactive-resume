import type { UIMessage } from "ai";
import { ORPCError } from "@orpc/client";
import z from "zod";
import { protectedProcedure } from "../context";
import { aiRequestRateLimit, storageUploadRateLimit } from "../middleware/rate-limit";
import { agentService } from "../services/agent";

function isAgentEnvironmentUnavailable(error: unknown) {
	return error instanceof Error && error.message === "AGENT_ENVIRONMENT_UNAVAILABLE";
}

function throwUnavailable(): never {
	throw new ORPCError("PRECONDITION_FAILED", {
		message: "AI agent workspace is unavailable because REDIS_URL or ENCRYPTION_SECRET is not configured.",
	});
}

function base64ToUint8Array(value: string) {
	return Uint8Array.from(Buffer.from(value, "base64"));
}

function isUiMessage(value: unknown): value is UIMessage {
	if (!value || typeof value !== "object") return false;

	const message = value as Partial<UIMessage>;
	return (
		typeof message.id === "string" &&
		(message.role === "system" || message.role === "user" || message.role === "assistant") &&
		Array.isArray(message.parts)
	);
}

const threadsRouter = {
	list: protectedProcedure
		.route({
			method: "GET",
			path: "/agent/threads",
			tags: ["Agent"],
			operationId: "listAgentThreads",
			summary: "List agent threads",
		})
		.handler(async ({ context }) => {
			try {
				return await agentService.threads.list({ userId: context.user.id });
			} catch (error) {
				if (isAgentEnvironmentUnavailable(error)) throwUnavailable();
				throw error;
			}
		}),

	create: protectedProcedure
		.route({
			method: "POST",
			path: "/agent/threads",
			tags: ["Agent"],
			operationId: "createAgentThread",
			summary: "Create agent thread",
		})
		.input(z.object({ aiProviderId: z.string().optional(), sourceResumeId: z.string().optional() }))
		.handler(async ({ context, input }) => {
			try {
				return await agentService.threads.create({
					userId: context.user.id,
					locale: context.locale,
					...(input.aiProviderId ? { aiProviderId: input.aiProviderId } : {}),
					...(input.sourceResumeId ? { sourceResumeId: input.sourceResumeId } : {}),
				});
			} catch (error) {
				if (isAgentEnvironmentUnavailable(error)) throwUnavailable();
				throw error;
			}
		}),

	get: protectedProcedure
		.route({
			method: "GET",
			path: "/agent/threads/{id}",
			tags: ["Agent"],
			operationId: "getAgentThread",
			summary: "Get agent thread",
		})
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			try {
				return await agentService.threads.get({ id: input.id, userId: context.user.id });
			} catch (error) {
				if (isAgentEnvironmentUnavailable(error)) throwUnavailable();
				throw error;
			}
		}),

	archive: protectedProcedure
		.route({
			method: "POST",
			path: "/agent/threads/{id}/archive",
			tags: ["Agent"],
			operationId: "archiveAgentThread",
			summary: "Archive agent thread",
		})
		.input(z.object({ id: z.string() }))
		.output(z.void())
		.handler(async ({ context, input }) => {
			try {
				await agentService.threads.archive({ id: input.id, userId: context.user.id });
			} catch (error) {
				if (isAgentEnvironmentUnavailable(error)) throwUnavailable();
				throw error;
			}
		}),

	delete: protectedProcedure
		.route({
			method: "DELETE",
			path: "/agent/threads/{id}",
			tags: ["Agent"],
			operationId: "deleteAgentThread",
			summary: "Delete agent thread",
		})
		.input(z.object({ id: z.string() }))
		.output(z.void())
		.handler(async ({ context, input }) => {
			try {
				await agentService.threads.delete({ id: input.id, userId: context.user.id });
			} catch (error) {
				if (isAgentEnvironmentUnavailable(error)) throwUnavailable();
				throw error;
			}
		}),
};

const messagesRouter = {
	send: protectedProcedure
		.route({
			method: "POST",
			path: "/agent/messages/send",
			tags: ["Agent"],
			operationId: "sendAgentMessage",
			summary: "Send agent message",
		})
		.input(
			z.object({
				threadId: z.string(),
				message: z.custom<UIMessage>(isUiMessage, { message: "Invalid UI message." }),
				attachmentIds: z.array(z.string().trim().min(1)).max(10).optional(),
			}),
		)
		.use(aiRequestRateLimit)
		.handler(async ({ context, input }) => {
			try {
				return await agentService.messages.send({
					userId: context.user.id,
					threadId: input.threadId,
					message: input.message,
					...(input.attachmentIds ? { attachmentIds: input.attachmentIds } : {}),
				});
			} catch (error) {
				if (isAgentEnvironmentUnavailable(error)) throwUnavailable();
				throw error;
			}
		}),

	stop: protectedProcedure
		.route({
			method: "POST",
			path: "/agent/messages/stop",
			tags: ["Agent"],
			operationId: "stopAgentMessage",
			summary: "Stop active agent run",
		})
		.input(
			z.object({
				threadId: z.string(),
				partialMessage: z.custom<UIMessage>(isUiMessage, { message: "Invalid UI message." }).optional(),
			}),
		)
		.output(z.void())
		.handler(async ({ context, input }) => {
			try {
				await agentService.messages.stop({
					userId: context.user.id,
					threadId: input.threadId,
					...(input.partialMessage ? { partialMessage: input.partialMessage } : {}),
				});
			} catch (error) {
				if (isAgentEnvironmentUnavailable(error)) throwUnavailable();
				throw error;
			}
		}),

	resume: protectedProcedure
		.route({
			method: "GET",
			path: "/agent/messages/resume",
			tags: ["Agent"],
			operationId: "resumeAgentMessages",
			summary: "Resume agent message stream",
		})
		.input(z.object({ threadId: z.string() }))
		.handler(async ({ context, input }) => {
			try {
				return await agentService.messages.resume({ userId: context.user.id, threadId: input.threadId });
			} catch (error) {
				if (isAgentEnvironmentUnavailable(error)) throwUnavailable();
				throw error;
			}
		}),
};

const attachmentsRouter = {
	create: protectedProcedure
		.route({
			method: "POST",
			path: "/agent/attachments",
			tags: ["Agent"],
			operationId: "createAgentAttachment",
			summary: "Create agent attachment",
		})
		.input(
			z.object({
				threadId: z.string(),
				filename: z.string().trim().min(1),
				mediaType: z.string().trim().min(1),
				data: z.string().min(1),
			}),
		)
		.use(storageUploadRateLimit)
		.handler(async ({ context, input }) => {
			try {
				return await agentService.attachments.create({
					userId: context.user.id,
					threadId: input.threadId,
					filename: input.filename,
					mediaType: input.mediaType,
					data: base64ToUint8Array(input.data),
				});
			} catch (error) {
				if (isAgentEnvironmentUnavailable(error)) throwUnavailable();
				throw error;
			}
		}),

	delete: protectedProcedure
		.route({
			method: "DELETE",
			path: "/agent/attachments/{id}",
			tags: ["Agent"],
			operationId: "deleteAgentAttachment",
			summary: "Delete agent attachment",
		})
		.input(z.object({ id: z.string() }))
		.output(z.void())
		.handler(async ({ context, input }) => {
			try {
				await agentService.attachments.delete({ id: input.id, userId: context.user.id });
			} catch (error) {
				if (isAgentEnvironmentUnavailable(error)) throwUnavailable();
				throw error;
			}
		}),
};

const actionsRouter = {
	revert: protectedProcedure
		.route({
			method: "POST",
			path: "/agent/actions/{id}/revert",
			tags: ["Agent"],
			operationId: "revertAgentAction",
			summary: "Revert agent action",
		})
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			try {
				return await agentService.actions.revert({ id: input.id, userId: context.user.id });
			} catch (error) {
				if (isAgentEnvironmentUnavailable(error)) throwUnavailable();
				throw error;
			}
		}),
};

export const agentRouter = {
	threads: threadsRouter,
	messages: messagesRouter,
	attachments: attachmentsRouter,
	actions: actionsRouter,
};
