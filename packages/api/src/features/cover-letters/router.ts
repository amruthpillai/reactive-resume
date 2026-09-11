import { protectedProcedure } from "../../context";
import { coverLetterDto } from "../../dto/cover-letter";
import { coverLetterService } from "./service";

export const coverLettersRouter = {
	list: protectedProcedure
		.route({
			method: "GET",
			path: "/cover-letters",
			tags: ["Cover Letters"],
			operationId: "listCoverLetters",
			summary: "List cover letters",
			description:
				"Returns the authenticated user's saved cover letters, optionally filtered by search, resume, or application.",
			successDescription: "A paginated list of cover letters.",
		})
		.input(coverLetterDto.list.input)
		.output(coverLetterDto.list.output)
		.handler(({ context, input }) => coverLetterService.list({ ...input, userId: context.user.id })),
	getById: protectedProcedure
		.route({
			method: "GET",
			path: "/cover-letters/{id}",
			tags: ["Cover Letters"],
			operationId: "getCoverLetter",
			summary: "Get cover letter by ID",
			description: "Returns a single saved cover letter belonging to the authenticated user.",
			successDescription: "The cover letter.",
		})
		.input(coverLetterDto.getById.input)
		.output(coverLetterDto.getById.output)
		.handler(({ context, input }) => coverLetterService.getById({ ...input, userId: context.user.id })),
	create: protectedProcedure
		.route({
			method: "POST",
			path: "/cover-letters",
			tags: ["Cover Letters"],
			operationId: "createCoverLetter",
			summary: "Create a cover letter",
			description: "Creates a saved cover letter, optionally linked to a resume or job application.",
			successDescription: "The newly created cover letter.",
		})
		.input(coverLetterDto.create.input)
		.output(coverLetterDto.create.output)
		.handler(({ context, input }) => coverLetterService.create({ ...input, userId: context.user.id })),
	update: protectedProcedure
		.route({
			method: "PUT",
			path: "/cover-letters/{id}",
			tags: ["Cover Letters"],
			operationId: "updateCoverLetter",
			summary: "Update a cover letter",
			description: "Updates the supplied fields of a saved cover letter using its expected revision.",
			successDescription: "The updated cover letter.",
		})
		.input(coverLetterDto.update.input)
		.output(coverLetterDto.update.output)
		.handler(({ context, input }) => coverLetterService.update({ ...input, userId: context.user.id })),
	refreshStyle: protectedProcedure
		.route({
			method: "POST",
			path: "/cover-letters/{id}/refresh-style",
			tags: ["Cover Letters"],
			operationId: "refreshCoverLetterStyle",
			summary: "Refresh cover letter style",
			description: "Refreshes a cover letter's style from a selected resume while preserving its content and template.",
			successDescription: "The cover letter with refreshed style.",
		})
		.input(coverLetterDto.refreshStyle.input)
		.output(coverLetterDto.refreshStyle.output)
		.handler(({ context, input }) => coverLetterService.refreshStyle({ ...input, userId: context.user.id })),
	duplicate: protectedProcedure
		.route({
			method: "POST",
			path: "/cover-letters/{id}/duplicate",
			tags: ["Cover Letters"],
			operationId: "duplicateCoverLetter",
			summary: "Duplicate a cover letter",
			description: "Creates a copy of an existing saved cover letter, optionally with a new name.",
			successDescription: "The duplicated cover letter.",
		})
		.input(coverLetterDto.duplicate.input)
		.output(coverLetterDto.duplicate.output)
		.handler(({ context, input }) => coverLetterService.duplicate({ ...input, userId: context.user.id })),
	delete: protectedProcedure
		.route({
			method: "DELETE",
			path: "/cover-letters/{id}",
			tags: ["Cover Letters"],
			operationId: "deleteCoverLetter",
			summary: "Delete a cover letter",
			description: "Permanently deletes a saved cover letter using its expected revision.",
			successDescription: "The cover letter was deleted successfully.",
		})
		.input(coverLetterDto.delete.input)
		.output(coverLetterDto.delete.output)
		.handler(({ context, input }) => coverLetterService.delete({ ...input, userId: context.user.id })),
	copyEmbedded: protectedProcedure
		.route({
			method: "POST",
			path: "/cover-letters/from-resume",
			tags: ["Cover Letters"],
			operationId: "copyEmbeddedCoverLetter",
			summary: "Copy an embedded cover letter",
			description: "Creates a saved cover letter by copying an embedded cover-letter item from a resume.",
			successDescription: "The newly created cover letter.",
		})
		.input(coverLetterDto.copyEmbedded.input)
		.output(coverLetterDto.copyEmbedded.output)
		.handler(({ context, input }) => coverLetterService.copyEmbedded({ ...input, userId: context.user.id })),
	export: protectedProcedure
		.route({
			method: "GET",
			path: "/cover-letters/{id}/export",
			tags: ["Cover Letters"],
			operationId: "exportCoverLetter",
			summary: "Export a cover letter",
			description: "Exports a saved cover letter as a standalone Reactive Resume cover-letter document.",
			successDescription: "The exported cover letter document.",
		})
		.input(coverLetterDto.export.input)
		.output(coverLetterDto.export.output)
		.handler(({ context, input }) => coverLetterService.export({ ...input, userId: context.user.id })),
	import: protectedProcedure
		.route({
			method: "POST",
			path: "/cover-letters/import",
			tags: ["Cover Letters"],
			operationId: "importCoverLetter",
			summary: "Import a cover letter",
			description: "Creates a saved cover letter from an exported Reactive Resume cover-letter document.",
			successDescription: "The imported cover letter.",
		})
		.input(coverLetterDto.import.input)
		.output(coverLetterDto.import.output)
		.handler(({ context, input }) => coverLetterService.import({ ...input, userId: context.user.id })),
};
