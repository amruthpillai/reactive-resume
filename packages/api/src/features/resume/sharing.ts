import z from "zod";
import { protectedProcedure, publicProcedure } from "../../context";
import { resumeDto } from "../../dto/resume";
import { resumeMutationRateLimit, resumePasswordRateLimit } from "../../middleware/rate-limit";
import { resumeService } from "./service";

export const sharingRouter = {
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
			return resumeService.getBySlug({
				...input,
				requestHeaders: context.reqHeaders,
				...(context.user?.id ? { currentUserId: context.user.id } : {}),
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
		.use(resumeMutationRateLimit)
		.output(resumeDto.setPassword.output)
		.handler(async ({ context, input }) => {
			return resumeService.setPassword({
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
		.use(resumePasswordRateLimit)
		.output(z.boolean())
		.handler(async ({ context, input }): Promise<boolean> => {
			return resumeService.verifyPassword({
				username: input.username,
				slug: input.slug,
				password: input.password,
				...(context.resHeaders ? { responseHeaders: context.resHeaders } : {}),
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
		.use(resumeMutationRateLimit)
		.output(resumeDto.removePassword.output)
		.handler(async ({ context, input }) => {
			return resumeService.removePassword({
				id: input.id,
				userId: context.user.id,
			});
		}),
};
