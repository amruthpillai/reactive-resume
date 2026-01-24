import z from "zod";
import { protectedProcedure, publicProcedure } from "../context";
import { printerService } from "../services/printer";
import { resumeService } from "../services/resume";

export const printerRouter = {
	printResumeAsPDF: publicProcedure
		.route({
			method: "GET",
			path: "/printer/resume/{id}/pdf",
			tags: ["Resume", "Printer"],
			summary: "Export resume as PDF",
			description: "Export a resume as a PDF. Returns a URL to download the PDF.",
		})
		.input(z.object({ id: z.string() }))
		.output(z.object({ url: z.string() }))
		.handler(async ({ input, context }) => {
			const resume = await resumeService.getByIdForPrinter({ id: input.id });
			const url = await printerService.printResumeAsPDF(resume);

			if (!context.user) {
				await resumeService.statistics.increment({ id: input.id, downloads: true });
			}

			return { url };
		}),

	getResumeScreenshot: protectedProcedure
		.route({
			method: "GET",
			path: "/printer/resume/{id}/screenshot",
			tags: ["Resume", "Printer"],
			summary: "Get resume screenshot",
			description: "Get a screenshot of a resume. Returns a URL to the screenshot image.",
		})
		.input(z.object({ id: z.string() }))
		.output(z.object({ url: z.string() }))
		.handler(async ({ input }) => {
			const resume = await resumeService.getByIdForPrinter({ id: input.id });
			const url = await printerService.getResumeScreenshot(resume);

			return { url };
		}),
};
