import type { UIMessage } from "ai";
import z from "zod";
import { protectedProcedure } from "../../context";
import { aiRequestRateLimit } from "../../middleware/rate-limit";
import { isUiMessage, mapAgentEnvironmentError } from "./routing";
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
		.use(mapAgentEnvironmentError)
		.handler(({ context, input }) =>
			agentService.messages.send({
				userId: context.user.id,
				threadId: input.threadId,
				message: input.message,
				...(input.attachmentIds ? { attachmentIds: input.attachmentIds } : {}),
			}),
		),

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
				// Deprecated and ignored: partial content now persists server-side via the run's
				// abort path. Kept in the schema for one release so mid-deploy clients still parse.
				partialMessage: z.custom<UIMessage>(isUiMessage, { message: "Invalid UI message." }).optional(),
			}),
		)
		.output(z.void())
		.use(mapAgentEnvironmentError)
		.handler(({ context, input }) =>
			agentService.messages.stop({
				userId: context.user.id,
				threadId: input.threadId,
			}),
		),

	resume: protectedProcedure
		.route({
			method: "GET",
			path: "/agent/messages/resume",
			tags: ["Agent"],
			operationId: "resumeAgentMessages",
			summary: "Resume agent message stream",
		})
		.input(z.object({ threadId: z.string() }))
		.use(mapAgentEnvironmentError)
		.handler(({ context, input }) =>
			agentService.messages.resume({ userId: context.user.id, threadId: input.threadId }),
		),
};
