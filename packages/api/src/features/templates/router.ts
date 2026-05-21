import type { TemplateMetadata } from "@reactive-resume/schema/template-metadata";
import { ORPCError } from "@orpc/server";
import z from "zod";
import { protectedProcedure, publicProcedure } from "../../context";
import { templateService } from "./service";

export const templatesRouter = {
	list: publicProcedure
		.route({
			method: "GET",
			path: "/templates",
			tags: ["Templates"],
			operationId: "listTemplates",
			summary: "List all templates",
			description:
				"Returns a list of all available resume templates. Includes both built-in templates and user-imported custom templates.",
			successDescription: "A list of all available resume templates.",
			outputStructure: "detailed",
		})
		.output(
			z.array(
				z.object({
					id: z.string(),
					name: z.string(),
					description: z.string().nullable(),
					author: z.string().nullable(),
					tags: z.array(z.string()),
					createdAt: z.date(),
					updatedAt: z.date(),
					sidebarPosition: z.string().nullable(),
					userId: z.string().nullable(),
				}),
			),
		)
		.handler(async () => {
			const all = await templateService.list();
			return all.map((t) => ({
				id: t.id,
				name: t.name,
				description: t.description ?? null,
				author: t.author ?? null,
				tags: t.tags ?? [],
				createdAt: t.createdAt,
				updatedAt: t.updatedAt,
				sidebarPosition:
					typeof t.metadata === "object" && t.metadata !== null
						? ((t.metadata as TemplateMetadata).sidebarPosition ?? null)
						: null,
				userId: t.userId ?? null,
			}));
		}),

	exportTemplate: protectedProcedure
		.route({
			method: "GET",
			path: "/templates/{id}",
			tags: ["Templates"],
			operationId: "exportTemplate",
			summary: "Export a template",
			description: "Returns the full template definition including metadata and declared custom inputs.",
			successDescription: "The full template definition including metadata and declared custom inputs.",
			outputStructure: "detailed",
		})
		.input(z.object({ id: z.string().describe("Template id") }))
		.handler(async ({ input }) => {
			const record = await templateService.getById(input.id);
			if (!record) {
				throw new ORPCError("NOT_FOUND", { message: `Template "${input.id}" not found` });
			}
			return {
				id: record.id,
				name: record.name,
				description: record.description ?? null,
				author: record.author ?? null,
				tags: record.tags ?? [],
				files: record.files,
				metadata: record.metadata as TemplateMetadata,
				inputs: record.inputs ?? [],
				userId: record.userId ?? null,
				createdAt: record.createdAt,
				updatedAt: record.updatedAt,
			};
		}),

	importTemplate: protectedProcedure
		.route({
			method: "POST",
			path: "/templates",
			tags: ["Templates"],
			operationId: "importTemplate",
			summary: "Import a custom template",
			description:
				"Upload a base64-encoded .rxt zip archive. The archive is validated and parsed before being stored. Imported templates are scoped to the authenticated user.",
			successDescription: "The stored template record.",
			outputStructure: "detailed",
		})
		.input(
			z.object({
				zipBase64: z.string().min(1).describe("Base64-encoded .rxt zip archive"),
			}),
		)
		.handler(async ({ input, context }) => {
			const zipBuffer = Buffer.from(input.zipBase64, "base64");
			const record = await templateService.createFromZip(zipBuffer, context.user.id);
			return {
				id: record.id,
				name: record.name,
				description: record.description ?? null,
				author: record.author ?? null,
				tags: record.tags ?? [],
				userId: record.userId ?? null,
				createdAt: record.createdAt,
				updatedAt: record.updatedAt,
			};
		}),

	deleteTemplate: protectedProcedure
		.route({
			method: "DELETE",
			path: "/templates/{id}",
			tags: ["Templates"],
			operationId: "deleteTemplate",
			summary: "Delete a user-imported template",
			description: "Deletes a template owned by the authenticated user. Built-in templates cannot be deleted.",
			successDescription: "Deletion result.",
			outputStructure: "detailed",
		})
		.input(z.object({ id: z.string().describe("Template id") }))
		.handler(async ({ input, context }) => {
			const deleted = await templateService.delete(input.id, context.user.id);
			if (!deleted) {
				throw new ORPCError("NOT_FOUND", { message: "Template not found or not owned by you" });
			}
			return { id: input.id };
		}),
};
