import z from "zod";
import { protectedProcedure } from "../../context";
import { isAgentEnvironmentUnavailable, throwUnavailable } from "./routing";
import { agentService } from "./service";

export const actionsRouter = {
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
