import { ORPCError } from "@orpc/client";
import z from "zod";
import { postFilterOptionsSchema, searchParamsSchema } from "@/schema/jobs";
import { protectedProcedure } from "../context";
import { jobsService } from "../services/jobs";

export const jobsRouter = {
	testConnection: protectedProcedure
		.route({
			method: "POST",
			path: "/jobs/test-connection",
			tags: ["Jobs"],
			operationId: "testJobsConnection",
			summary: "Test RapidAPI JSearch connection",
			description:
				"Validates the RapidAPI key by performing a minimal test search against the JSearch API. Requires authentication.",
			successDescription: "The RapidAPI key is valid and JSearch is reachable.",
		})
		.input(z.object({ apiKey: z.string().min(1) }))
		.errors({
			BAD_GATEWAY: {
				message: "The JSearch API returned an error or is unreachable.",
				status: 502,
			},
		})
		.handler(async ({ input }) => {
			try {
				return await jobsService.testConnection(input.apiKey);
			} catch (error) {
				throw new ORPCError("BAD_GATEWAY", {
					message: error instanceof Error ? error.message : "Connection test failed",
				});
			}
		}),

	search: protectedProcedure
		.route({
			method: "POST",
			path: "/jobs/search",
			tags: ["Jobs"],
			operationId: "searchJobs",
			summary: "Search for job listings",
			description:
				"Searches the JSearch API for job listings matching the given parameters. Results are deduplicated and optionally filtered. Requires authentication.",
			successDescription: "Job search results returned successfully.",
		})
		.input(
			z.object({
				apiKey: z.string().min(1),
				params: searchParamsSchema,
				filters: postFilterOptionsSchema.optional(),
			}),
		)
		.errors({
			BAD_GATEWAY: {
				message: "The JSearch API returned an error or is unreachable.",
				status: 502,
			},
		})
		.handler(async ({ input }) => {
			try {
				const response = await jobsService.search(input.apiKey, input.params);

				let jobs = jobsService.deduplicateJobs(response.data);

				if (input.filters) {
					jobs = jobsService.applyPostFilters(jobs, input.filters);
				}

				return { data: jobs, rapidApiQuota: response.rapidApiQuota };
			} catch (error) {
				throw new ORPCError("BAD_GATEWAY", {
					message: error instanceof Error ? error.message : "Search failed",
				});
			}
		}),

	details: protectedProcedure
		.route({
			method: "POST",
			path: "/jobs/details",
			tags: ["Jobs"],
			operationId: "getJobDetails",
			summary: "Get detailed information about a job listing",
			description:
				"Fetches full details for a specific job listing by ID from the JSearch API. Requires authentication.",
			successDescription: "Job details returned successfully.",
		})
		.input(
			z.object({
				apiKey: z.string().min(1),
				jobId: z.string().min(1),
			}),
		)
		.errors({
			BAD_GATEWAY: {
				message: "The JSearch API returned an error or is unreachable.",
				status: 502,
			},
			NOT_FOUND: {
				message: "Job listing not found.",
				status: 404,
			},
		})
		.handler(async ({ input }) => {
			try {
				const job = await jobsService.getJobDetails(input.apiKey, input.jobId);

				if (!job) {
					throw new ORPCError("NOT_FOUND", { message: "Job listing not found" });
				}

				return job;
			} catch (error) {
				if (error instanceof ORPCError) throw error;

				throw new ORPCError("BAD_GATEWAY", {
					message: error instanceof Error ? error.message : "Failed to fetch job details",
				});
			}
		}),
};
