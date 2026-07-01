import { protectedProcedure } from "../../context";
import { customTemplateDto } from "../../dto/custom-template";
import { customTemplateService } from "./service";

export const customTemplateCrudRouter = {
	list: protectedProcedure
		.route({
			method: "GET",
			path: "/custom-templates",
			tags: ["Custom Templates"],
			operationId: "listCustomTemplates",
			summary: "List all custom templates",
		})
		.output(customTemplateDto.list.output)
		.handler(async ({ context }) => customTemplateService.list({ userId: context.user.id })),

	getById: protectedProcedure
		.route({
			method: "GET",
			path: "/custom-templates/{id}",
			tags: ["Custom Templates"],
			operationId: "getCustomTemplate",
			summary: "Get custom template by ID",
		})
		.input(customTemplateDto.getById.input)
		.output(customTemplateDto.getById.output)
		.handler(async ({ context, input }) => customTemplateService.getById({ id: input.id, userId: context.user.id })),

	create: protectedProcedure
		.route({
			method: "POST",
			path: "/custom-templates",
			tags: ["Custom Templates"],
			operationId: "createCustomTemplate",
			summary: "Create a custom template",
		})
		.input(customTemplateDto.create.input)
		.output(customTemplateDto.create.output)
		.handler(async ({ context, input }) =>
			customTemplateService.create({ userId: context.user.id, name: input.name, data: input.data }),
		),

	update: protectedProcedure
		.route({
			method: "PUT",
			path: "/custom-templates/{id}",
			tags: ["Custom Templates"],
			operationId: "updateCustomTemplate",
			summary: "Update a custom template",
		})
		.input(customTemplateDto.update.input)
		.output(customTemplateDto.update.output)
		.handler(async ({ context, input }) =>
			customTemplateService.update({
				id: input.id,
				userId: context.user.id,
				...(input.name !== undefined ? { name: input.name } : {}),
				...(input.data !== undefined ? { data: input.data } : {}),
			}),
		),

	delete: protectedProcedure
		.route({
			method: "DELETE",
			path: "/custom-templates/{id}",
			tags: ["Custom Templates"],
			operationId: "deleteCustomTemplate",
			summary: "Delete a custom template",
		})
		.input(customTemplateDto.delete.input)
		.output(customTemplateDto.delete.output)
		.handler(async ({ context, input }) => customTemplateService.delete({ id: input.id, userId: context.user.id })),
};
