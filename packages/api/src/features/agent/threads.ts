import z from "zod";
import { protectedProcedure } from "../../context";
import { isAgentEnvironmentUnavailable, throwUnavailable } from "./routing";
import { agentService } from "./service";

export const threadsRouter = {
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
