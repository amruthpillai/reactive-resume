import z from "zod";
import { protectedProcedure } from "../../context";
import { mapAgentEnvironmentError } from "./routing";
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
		.use(mapAgentEnvironmentError)
		.handler(({ context }) => agentService.threads.list({ userId: context.user.id })),

	create: protectedProcedure
		.route({
			method: "POST",
			path: "/agent/threads",
			tags: ["Agent"],
			operationId: "createAgentThread",
			summary: "Create agent thread",
		})
		.input(z.object({ aiProviderId: z.string().optional(), sourceResumeId: z.string().optional() }))
		.use(mapAgentEnvironmentError)
		.handler(({ context, input }) =>
			agentService.threads.create({
				userId: context.user.id,
				locale: context.locale,
				...(input.aiProviderId ? { aiProviderId: input.aiProviderId } : {}),
				...(input.sourceResumeId ? { sourceResumeId: input.sourceResumeId } : {}),
			}),
		),

	getOrCreateForResume: protectedProcedure
		.route({
			method: "POST",
			path: "/agent/threads/for-resume",
			tags: ["Agent"],
			operationId: "getOrCreateAgentThreadForResume",
			summary: "Get or create an in-resume agent thread",
		})
		.input(z.object({ resumeId: z.string(), aiProviderId: z.string().optional() }))
		.use(mapAgentEnvironmentError)
		.handler(({ context, input }) =>
			agentService.threads.getOrCreateForResume({
				userId: context.user.id,
				resumeId: input.resumeId,
				...(input.aiProviderId ? { aiProviderId: input.aiProviderId } : {}),
			}),
		),

	get: protectedProcedure
		.route({
			method: "GET",
			path: "/agent/threads/{id}",
			tags: ["Agent"],
			operationId: "getAgentThread",
			summary: "Get agent thread",
		})
		.input(z.object({ id: z.string() }))
		.use(mapAgentEnvironmentError)
		.handler(({ context, input }) => agentService.threads.get({ id: input.id, userId: context.user.id })),

	update: protectedProcedure
		.route({
			method: "PATCH",
			path: "/agent/threads/{id}",
			tags: ["Agent"],
			operationId: "updateAgentThread",
			summary: "Update agent thread settings",
		})
		.input(z.object({ id: z.string(), reviewPatches: z.boolean() }))
		.use(mapAgentEnvironmentError)
		.handler(({ context, input }) =>
			agentService.threads.update({
				id: input.id,
				userId: context.user.id,
				reviewPatches: input.reviewPatches,
			}),
		),

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
		.use(mapAgentEnvironmentError)
		.handler(({ context, input }) => agentService.threads.archive({ id: input.id, userId: context.user.id })),

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
		.use(mapAgentEnvironmentError)
		.handler(({ context, input }) => agentService.threads.delete({ id: input.id, userId: context.user.id })),
};
