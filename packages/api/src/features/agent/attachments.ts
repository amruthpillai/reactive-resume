import z from "zod";
import { protectedProcedure } from "../../context";
import { storageUploadRateLimit } from "../../middleware/rate-limit";
import { isAgentEnvironmentUnavailable, throwUnavailable } from "./routing";
import { agentService } from "./service";

function base64ToUint8Array(value: string) {
	return Uint8Array.from(Buffer.from(value, "base64"));
}

export const attachmentsRouter = {
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
