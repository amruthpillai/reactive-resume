import z from "zod";
import { protectedProcedure } from "../../context";
import { resumeService } from "./service";

export const tagsRouter = {
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
			return resumeService.tags.list({ userId: context.user.id });
		}),
};
