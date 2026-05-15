import type { UIMessage } from "ai";
import z from "zod";
import { protectedProcedure } from "../../context";
import { aiRequestRateLimit } from "../../middleware/rate-limit";
import { isAgentEnvironmentUnavailable, isUiMessage, throwUnavailable } from "./routing";
import { agentService } from "./service";

export const messagesRouter = {
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
