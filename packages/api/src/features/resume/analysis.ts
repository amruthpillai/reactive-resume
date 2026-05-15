import z from "zod";
import { storedResumeAnalysisSchema } from "@reactive-resume/schema/resume/analysis";
import { protectedProcedure } from "../../context";
import { resumeService } from "./service";

export const analysisRouter = {
	getById: protectedProcedure
		.route({
			method: "GET",
			path: "/resumes/{id}/analysis",
			tags: ["Resume Analysis"],
			operationId: "getResumeAnalysis",
			summary: "Get latest resume analysis",
			description:
				"Returns the latest persisted AI analysis for the specified resume, if one exists. Requires authentication.",
			successDescription: "The latest persisted resume analysis, or null if no analysis has been saved yet.",
		})
		.input(z.object({ id: z.string().describe("The unique identifier of the resume.") }))
		.output(storedResumeAnalysisSchema.nullable())
		.handler(async ({ context, input }) => {
			return resumeService.analysis.getById({ id: input.id, userId: context.user.id });
		}),
};
