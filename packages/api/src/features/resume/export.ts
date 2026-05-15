import { ORPCError } from "@orpc/server";
import z from "zod";
import { createResumePdfFile } from "@reactive-resume/pdf/server";
import { generateFilename } from "@reactive-resume/utils/file";
import { protectedProcedure } from "../../context";
import { pdfExportRateLimit } from "../../middleware/rate-limit";
import { resumeService } from "./service";

export const downloadResumePdfProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/resumes/{id}/pdf",
		tags: ["Resumes"],
		operationId: "downloadResumePdf",
		summary: "Download resume as PDF",
		description:
			"Generates a PDF for the specified resume and returns it as a forced download. Only resumes belonging to the authenticated user can be downloaded. Requires authentication.",
		successDescription: "The generated resume PDF.",
		outputStructure: "detailed",
	})
	.input(z.object({ id: z.string().describe("The ID of the resume.") }))
	.output(
		z.object({
			headers: z.object({
				"content-disposition": z.string(),
			}),
			body: z.file().mime("application/pdf"),
		}),
	)
	.use(pdfExportRateLimit)
	.handler(async ({ context, input }) => {
		const resume = await resumeService.getById({ id: input.id, userId: context.user.id });
		const filename = generateFilename(resume.name, "pdf");

		try {
			const body = await createResumePdfFile({ data: resume.data, filename });

			return {
				headers: {
					"content-disposition": `attachment; filename="${filename}"`,
				},
				body,
			};
		} catch (error) {
			console.error("[PDF API] Failed to render resume PDF", { resumeId: input.id, error });
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to generate resume PDF" });
		}
	});
