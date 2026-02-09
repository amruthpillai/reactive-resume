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
			path: "/resumes/tags",
			tags: ["Resumes"],
			operationId: "listResumeTags",
			summary: "List all resume tags",
			description:
				"Returns a sorted list of all unique tags across the authenticated user's resumes. Useful for populating tag filters in the dashboard. Requires authentication.",
			successDescription: "A sorted array of unique tag strings.",
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
			path: "/resumes/{id}/statistics",
			tags: ["Resume Statistics"],
			operationId: "getResumeStatistics",
			summary: "Get resume statistics",
			description:
				"Returns view and download statistics for the specified resume, including total counts and the timestamps of the last view and download. Requires authentication.",
			successDescription: "The resume's view and download statistics.",
		})
		.input(z.object({ id: z.string().describe("The unique identifier of the resume.") }))
		.output(
			z.object({
				isPublic: z.boolean().describe("Whether the resume is currently public."),
				views: z.number().describe("Total number of times the resume has been viewed."),
				downloads: z.number().describe("Total number of times the resume has been downloaded."),
				lastViewedAt: z.date().nullable().describe("Timestamp of the last view, or null if never viewed."),
				lastDownloadedAt: z.date().nullable().describe("Timestamp of the last download, or null if never downloaded."),
			}),
		)
		.handler(async ({ context, input }) => {
			return await resumeService.statistics.getById({ id: input.id, userId: context.user.id });
		}),

	increment: publicProcedure
		.route({ tags: ["Internal"], operationId: "incrementResumeStatistics", summary: "Increment resume statistics" })
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
			path: "/resumes",
			tags: ["Resumes"],
			operationId: "listResumes",
			summary: "List all resumes",
			description:
				"Returns a list of all resumes belonging to the authenticated user. Results can be filtered by tags and sorted by last updated date, creation date, or name. Resume data is not included in the response for performance; use the get endpoint to fetch full resume data. Requires authentication.",
			successDescription: "A list of resumes with their metadata (without full resume data).",
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
			path: "/resumes/{id}",
			tags: ["Resumes"],
			operationId: "getResume",
			summary: "Get resume by ID",
			description:
				"Returns a single resume with its full data, identified by its unique ID. Only resumes belonging to the authenticated user can be retrieved. Requires authentication.",
			successDescription: "The resume with its full data.",
		})
		.input(resumeDto.getById.input)
		.output(resumeDto.getById.output)
		.handler(async ({ context, input }) => {
			return await resumeService.getById({ id: input.id, userId: context.user.id });
		}),

	getByIdForPrinter: serverOnlyProcedure
		.route({ tags: ["Internal"], operationId: "getResumeForPrinter", summary: "Get resume by ID for printer" })
		.input(resumeDto.getById.input)
		.handler(async ({ input }) => {
			return await resumeService.getByIdForPrinter({ id: input.id });
		}),

	getBySlug: publicProcedure
		.route({
			method: "GET",
			path: "/resumes/{username}/{slug}",
			tags: ["Resume Sharing"],
			operationId: "getResumeBySlug",
			summary: "Get public resume by username and slug",
			description:
				"Returns a publicly shared resume identified by the owner's username and the resume's slug. If the resume is password-protected and the viewer has not yet verified the password, a 401 error with code NEED_PASSWORD is returned. No authentication required for public resumes; if authenticated as the owner, private resumes are also accessible.",
			successDescription: "The public resume with its full data.",
		})
		.input(resumeDto.getBySlug.input)
		.output(resumeDto.getBySlug.output)
		.handler(async ({ input, context }) => {
			return await resumeService.getBySlug({ ...input, currentUserId: context.user?.id });
		}),

	create: protectedProcedure
		.route({
			method: "POST",
			path: "/resumes",
			tags: ["Resumes"],
			operationId: "createResume",
			summary: "Create a new resume",
			description:
				"Creates a new resume with the given name, slug, and tags. Optionally initializes the resume with sample data by setting withSampleData to true. The slug must be unique across the user's resumes. Returns the ID of the newly created resume. Requires authentication.",
			successDescription: "The ID of the newly created resume.",
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
			path: "/resumes/import",
			tags: ["Resumes"],
			operationId: "importResume",
			summary: "Import a resume",
			description:
				"Creates a new resume from an existing ResumeData object (e.g. from a previously exported JSON file). A random name and slug are generated automatically. Returns the ID of the imported resume. Requires authentication.",
			successDescription: "The ID of the imported resume.",
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
			path: "/resumes/{id}",
			tags: ["Resumes"],
			operationId: "updateResume",
			summary: "Update a resume",
			description:
				"Updates one or more fields of a resume identified by its ID. All fields are optional; only provided fields will be updated. Locked resumes cannot be updated. Requires authentication.",
			successDescription: "The updated resume with its full data.",
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
			path: "/resumes/{id}",
			tags: ["Resumes"],
			operationId: "patchResume",
			summary: "Patch resume data",
			description:
				"Applies JSON Patch (RFC 6902) operations to partially update a resume's data. This allows small, targeted changes (e.g. updating a single field) without sending the entire resume object. Locked resumes cannot be patched. Requires authentication.",
			successDescription: "The patched resume with its full data.",
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
			path: "/resumes/{id}/lock",
			tags: ["Resumes"],
			operationId: "setResumeLocked",
			summary: "Set resume lock status",
			description:
				"Toggles the locked status of a resume. When locked, a resume cannot be updated, patched, or deleted. Useful for protecting finalized resumes from accidental edits. Requires authentication.",
			successDescription: "The resume lock status was updated successfully.",
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
			method: "PUT",
			path: "/resumes/{id}/password",
			tags: ["Resume Sharing"],
			operationId: "setResumePassword",
			summary: "Set resume password",
			description:
				"Sets or updates a password on a resume. When a password is set, viewers of the public resume must enter the password before the resume data is revealed. The password must be between 6 and 64 characters. Requires authentication.",
			successDescription: "The resume password was set successfully.",
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

	verifyPassword: publicProcedure
		.route({
			method: "POST",
			path: "/resumes/{username}/{slug}/password/verify",
			tags: ["Resume Sharing"],
			operationId: "verifyResumePassword",
			summary: "Verify resume password",
			description:
				"Verifies a password for a password-protected public resume. On success, the viewer is granted access to view the resume data for the duration of their session. No authentication required.",
			successDescription: "The password was verified successfully and access has been granted.",
		})
		.input(
			z.object({
				username: z.string().min(1).describe("The username of the resume owner."),
				slug: z.string().min(1).describe("The slug of the resume."),
				password: z.string().min(1).describe("The password to verify."),
			}),
		)
		.output(z.boolean())
		.handler(async ({ input }): Promise<boolean> => {
			return await resumeService.verifyPassword({
				username: input.username,
				slug: input.slug,
				password: input.password,
			});
		}),

	removePassword: protectedProcedure
		.route({
			method: "DELETE",
			path: "/resumes/{id}/password",
			tags: ["Resume Sharing"],
			operationId: "removeResumePassword",
			summary: "Remove resume password",
			description:
				"Removes password protection from a resume. After removal, the resume (if public) can be viewed without entering a password. Requires authentication.",
			successDescription: "The resume password was removed successfully.",
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
			path: "/resumes/{id}/duplicate",
			tags: ["Resumes"],
			operationId: "duplicateResume",
			summary: "Duplicate a resume",
			description:
				"Creates a copy of an existing resume with the same data. Optionally override the name, slug, and tags for the duplicate. If not provided, the original resume's name, slug, and tags are used. Returns the ID of the duplicated resume. Requires authentication.",
			successDescription: "The ID of the duplicated resume.",
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
			path: "/resumes/{id}",
			tags: ["Resumes"],
			operationId: "deleteResume",
			summary: "Delete a resume",
			description:
				"Permanently deletes a resume and its associated files (screenshots, PDFs) from storage. Locked resumes cannot be deleted; unlock the resume first. Requires authentication.",
			successDescription: "The resume and its associated files were deleted successfully.",
		})
		.input(resumeDto.delete.input)
		.output(resumeDto.delete.output)
		.handler(async ({ context, input }) => {
			return await resumeService.delete({ id: input.id, userId: context.user.id });
		}),
};
