import { protectedProcedure } from "../../context";
import { resumeDto } from "../../dto/resume";
import { resumeMutationRateLimit } from "../../middleware/rate-limit";
import { createDatabaseStylesheetService } from "./stylesheet-service";

const errors = {
	SEMANTIC_STYLESHEET_UNAVAILABLE: {
		message: "Semantic stylesheet PDF preflight is unavailable.",
		status: 503,
	},
	STYLESHEET_VALIDATION_FAILED: {
		message: "The stylesheet failed validation.",
		status: 400,
	},
	STYLESHEET_PARITY_FAILED: {
		message: "The converted stylesheet does not preserve legacy PDF presentation.",
		status: 400,
	},
	STYLESHEET_REVISION_CONFLICT: {
		message: "The resume or stylesheet changed while the candidate was being validated.",
		status: 409,
	},
} as const;

export const stylesheetRouter = {
	getState: protectedProcedure
		.route({
			method: "GET",
			path: "/resumes/{id}/stylesheet",
			tags: ["Resumes"],
			operationId: "getResumeStylesheetState",
			summary: "Get resume stylesheet state",
			description: "Returns the owner-only canonical semantic stylesheet state and concurrency versions.",
			successDescription: "The canonical stylesheet state.",
		})
		.input(resumeDto.stylesheet.getState.input)
		.output(resumeDto.stylesheet.getState.output)
		.handler(({ context, input }) =>
			createDatabaseStylesheetService({
				...(context.stylesheetPreflightRunner ? { runner: context.stylesheetPreflightRunner } : {}),
			}).getState({ id: input.id, userId: context.user.id }),
		),

	mutate: protectedProcedure
		.route({
			method: "POST",
			path: "/resumes/{id}/stylesheet",
			tags: ["Resumes"],
			operationId: "mutateResumeStylesheet",
			summary: "Mutate resume stylesheet state",
			description: "Applies one revisioned semantic stylesheet transition after validation and PDF preflight.",
			successDescription: "The committed canonical stylesheet state.",
		})
		.input(resumeDto.stylesheet.mutate.input)
		.use(resumeMutationRateLimit)
		.output(resumeDto.stylesheet.mutate.output)
		.errors(errors)
		.handler(({ context, input }) =>
			createDatabaseStylesheetService({
				...(context.stylesheetPreflightRunner ? { runner: context.stylesheetPreflightRunner } : {}),
			}).mutate({
				...input,
				userId: context.user.id,
			}),
		),
};
