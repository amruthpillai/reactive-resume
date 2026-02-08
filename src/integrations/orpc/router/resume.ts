import z from "zod";
import { sampleResumeData } from "@/schema/resume/sample";
import { generateRandomName, slugify } from "@/utils/string";
import { protectedProcedure, publicProcedure, serverOnlyProcedure } from "../context";
import { resumeDto } from "../dto/resume";
import { resumeService } from "../services/resume";

const tagsRouter = {
	list: protectedProcedure
		.route({
			method: "GET",
			path: "/resume/tags/list",
			tags: ["Resume"],
			summary: "List all resume tags",
			description: "List all tags for the authenticated user's resumes. Used to populate the filter in the dashboard.",
		})
		.output(z.array(z.string()))
		.handler(async ({ context }) => {
			return await resumeService.tags.list({ userId: context.user.id });
		}),
};

const statisticsRouter = {
	getById: protectedProcedure
		.route({
			method: "GET",
			path: "/resume/statistics/{id}",
			tags: ["Resume"],
			summary: "Get resume statistics",
			description: "Get the statistics for a resume, such as number of views and downloads.",
		})
		.input(z.object({ id: z.string() }))
		.output(
			z.object({
				isPublic: z.boolean(),
				views: z.number(),
				downloads: z.number(),
				lastViewedAt: z.date().nullable(),
				lastDownloadedAt: z.date().nullable(),
			}),
		)
		.handler(async ({ context, input }) => {
			return await resumeService.statistics.getById({ id: input.id, userId: context.user.id });
		}),

	increment: publicProcedure
		.route({ tags: ["Internal"], summary: "Increment resume statistics" })
		.input(z.object({ id: z.string(), views: z.boolean().default(false), downloads: z.boolean().default(false) }))
		.handler(async ({ input }) => {
			return await resumeService.statistics.increment(input);
		}),
};

export const resumeRouter = {
	tags: tagsRouter,
	statistics: statisticsRouter,

	list: protectedProcedure
		.route({
			method: "GET",
			path: "/resume/list",
			tags: ["Resume"],
			summary: "List all resumes",
			description: "List of all the resumes for the authenticated user.",
		})
		.input(resumeDto.list.input.optional().default({ tags: [], sort: "lastUpdatedAt" }))
		.output(resumeDto.list.output)
		.handler(async ({ input, context }) => {
			return await resumeService.list({
				userId: context.user.id,
				tags: input.tags,
				sort: input.sort,
			});
		}),

	getById: protectedProcedure
		.route({
			method: "GET",
			path: "/resume/{id}",
			tags: ["Resume"],
			summary: "Get resume by ID",
			description: "Get a resume, along with its data, by its ID.",
		})
		.input(resumeDto.getById.input)
		.output(resumeDto.getById.output)
		.handler(async ({ context, input }) => {
			return await resumeService.getById({ id: input.id, userId: context.user.id });
		}),

	getByIdForPrinter: serverOnlyProcedure
		.route({ tags: ["Internal"], summary: "Get resume by ID for printer" })
		.input(resumeDto.getById.input)
		.handler(async ({ input }) => {
			return await resumeService.getByIdForPrinter({ id: input.id });
		}),

	getBySlug: publicProcedure
		.route({
			method: "GET",
			path: "/resume/{username}/{slug}",
			tags: ["Resume"],
			summary: "Get resume by username and slug",
			description: "Get a resume, along with its data, by its username and slug.",
		})
		.input(resumeDto.getBySlug.input)
		.output(resumeDto.getBySlug.output)
		.handler(async ({ input, context }) => {
			return await resumeService.getBySlug({ ...input, currentUserId: context.user?.id });
		}),

	create: protectedProcedure
		.route({
			method: "POST",
			path: "/resume/create",
			tags: ["Resume"],
			summary: "Create a new resume",
			description: "Create a new resume, with the ability to initialize it with sample data.",
		})
		.input(resumeDto.create.input)
		.output(resumeDto.create.output)
		.errors({
			RESUME_SLUG_ALREADY_EXISTS: {
				message: "A resume with this slug already exists.",
				status: 400,
			},
		})
		.handler(async ({ context, input }) => {
			return await resumeService.create({
				name: input.name,
				slug: input.slug,
				tags: input.tags,
				locale: context.locale,
				userId: context.user.id,
				data: input.withSampleData ? sampleResumeData : undefined,
			});
		}),

	import: protectedProcedure
		.route({
			method: "POST",
			path: "/resume/import",
			tags: ["Resume"],
			summary: "Import a resume",
			description: "Import a resume from a file.",
		})
		.input(resumeDto.import.input)
		.output(resumeDto.import.output)
		.errors({
			RESUME_SLUG_ALREADY_EXISTS: {
				message: "A resume with this slug already exists.",
				status: 400,
			},
		})
		.handler(async ({ context, input }) => {
			const name = generateRandomName();
			const slug = slugify(name);

			return await resumeService.create({
				name,
				slug,
				tags: [],
				data: input.data,
				locale: context.locale,
				userId: context.user.id,
			});
		}),

	update: protectedProcedure
		.route({
			method: "PUT",
			path: "/resume/{id}",
			tags: ["Resume"],
			summary: "Update a resume",
			description: "Update a resume, along with its data, by its ID.",
		})
		.input(resumeDto.update.input)
		.output(resumeDto.update.output)
		.errors({
			RESUME_SLUG_ALREADY_EXISTS: {
				message: "A resume with this slug already exists.",
				status: 400,
			},
		})
		.handler(async ({ context, input }) => {
			return await resumeService.update({
				id: input.id,
				userId: context.user.id,
				name: input.name,
				slug: input.slug,
				tags: input.tags,
				data: input.data,
				isPublic: input.isPublic,
			});
		}),

	patch: protectedProcedure
		.route({
			method: "PATCH",
			path: "/resume/{id}",
			tags: ["Resume"],
			summary: "Patch a resume",
			description:
				"Apply JSON Patch (RFC 6902) operations to partially update a resume's data. This allows you to make small, targeted changes without sending the entire resume object.",
		})
		.input(resumeDto.patch.input)
		.output(resumeDto.patch.output)
		.errors({
			INVALID_PATCH_OPERATIONS: {
				message: "The patch operations are invalid or produced an invalid resume.",
				status: 400,
			},
		})
		.handler(async ({ context, input }) => {
			return await resumeService.patch({
				id: input.id,
				userId: context.user.id,
				operations: input.operations,
			});
		}),

	setLocked: protectedProcedure
		.route({
			method: "POST",
			path: "/resume/{id}/set-locked",
			tags: ["Resume"],
			summary: "Set resume locked status",
			description: "Toggle the locked status of a resume, by its ID.",
		})
		.input(resumeDto.setLocked.input)
		.output(resumeDto.setLocked.output)
		.handler(async ({ context, input }) => {
			return await resumeService.setLocked({
				id: input.id,
				userId: context.user.id,
				isLocked: input.isLocked,
			});
		}),

	setPassword: protectedProcedure
		.route({
			method: "POST",
			path: "/resume/{id}/set-password",
			tags: ["Resume"],
			summary: "Set password on a resume",
			description: "Set a password on a resume to protect it from unauthorized access when shared publicly.",
		})
		.input(resumeDto.setPassword.input)
		.output(resumeDto.setPassword.output)
		.handler(async ({ context, input }) => {
			return await resumeService.setPassword({
				id: input.id,
				userId: context.user.id,
				password: input.password,
			});
		}),

	removePassword: protectedProcedure
		.route({
			method: "POST",
			path: "/resume/{id}/remove-password",
			tags: ["Resume"],
			summary: "Remove password from a resume",
			description: "Remove password protection from a resume.",
		})
		.input(resumeDto.removePassword.input)
		.output(resumeDto.removePassword.output)
		.handler(async ({ context, input }) => {
			return await resumeService.removePassword({
				id: input.id,
				userId: context.user.id,
			});
		}),

	duplicate: protectedProcedure
		.route({
			method: "POST",
			path: "/resume/{id}/duplicate",
			tags: ["Resume"],
			summary: "Duplicate a resume",
			description: "Duplicate a resume, by its ID.",
		})
		.input(resumeDto.duplicate.input)
		.output(resumeDto.duplicate.output)
		.handler(async ({ context, input }) => {
			const original = await resumeService.getById({ id: input.id, userId: context.user.id });

			return await resumeService.create({
				userId: context.user.id,
				name: input.name ?? original.name,
				slug: input.slug ?? original.slug,
				tags: input.tags ?? original.tags,
				locale: context.locale,
				data: original.data,
			});
		}),

	delete: protectedProcedure
		.route({
			method: "DELETE",
			path: "/resume/{id}",
			tags: ["Resume"],
			summary: "Delete a resume",
			description: "Delete a resume, by its ID.",
		})
		.input(resumeDto.delete.input)
		.output(resumeDto.delete.output)
		.handler(async ({ context, input }) => {
			return await resumeService.delete({ id: input.id, userId: context.user.id });
		}),
};
