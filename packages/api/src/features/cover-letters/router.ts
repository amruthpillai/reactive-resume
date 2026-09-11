import { protectedProcedure } from "../../context";
import { coverLetterDto } from "../../dto/cover-letter";
import { coverLetterService } from "./service";

export const coverLettersRouter = {
	list: protectedProcedure
		.input(coverLetterDto.list.input)
		.output(coverLetterDto.list.output)
		.handler(({ context, input }) => coverLetterService.list({ ...input, userId: context.user.id })),
	getById: protectedProcedure
		.input(coverLetterDto.getById.input)
		.output(coverLetterDto.getById.output)
		.handler(({ context, input }) => coverLetterService.getById({ ...input, userId: context.user.id })),
	create: protectedProcedure
		.input(coverLetterDto.create.input)
		.output(coverLetterDto.create.output)
		.handler(({ context, input }) => coverLetterService.create({ ...input, userId: context.user.id })),
	update: protectedProcedure
		.input(coverLetterDto.update.input)
		.output(coverLetterDto.update.output)
		.handler(({ context, input }) => coverLetterService.update({ ...input, userId: context.user.id })),
	refreshStyle: protectedProcedure
		.input(coverLetterDto.refreshStyle.input)
		.output(coverLetterDto.refreshStyle.output)
		.handler(({ context, input }) => coverLetterService.refreshStyle({ ...input, userId: context.user.id })),
	duplicate: protectedProcedure
		.input(coverLetterDto.duplicate.input)
		.output(coverLetterDto.duplicate.output)
		.handler(({ context, input }) => coverLetterService.duplicate({ ...input, userId: context.user.id })),
	delete: protectedProcedure
		.input(coverLetterDto.delete.input)
		.output(coverLetterDto.delete.output)
		.handler(({ context, input }) => coverLetterService.delete({ ...input, userId: context.user.id })),
	copyEmbedded: protectedProcedure
		.input(coverLetterDto.copyEmbedded.input)
		.output(coverLetterDto.copyEmbedded.output)
		.handler(({ context, input }) => coverLetterService.copyEmbedded({ ...input, userId: context.user.id })),
	export: protectedProcedure
		.input(coverLetterDto.export.input)
		.output(coverLetterDto.export.output)
		.handler(({ context, input }) => coverLetterService.export({ ...input, userId: context.user.id })),
	import: protectedProcedure
		.input(coverLetterDto.import.input)
		.output(coverLetterDto.import.output)
		.handler(({ context, input }) => coverLetterService.import({ ...input, userId: context.user.id })),
};
