import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { ORPCError } from "@orpc/server";
import z from "zod";
import { templateService } from "@reactive-resume/api/features/templates";
import { generatePdfFromTemplate } from "@reactive-resume/pdf/server";
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
		const resumeData = resume.data as ResumeData;
		const templateRecord = await templateService.getById(resumeData.metadata.template);

		if (!templateRecord) {
			throw new ORPCError("NOT_FOUND", { message: "Template not found" });
		}

		const filename = generateFilename(resume.name, "pdf");
		const pdfBinary = await generatePdfFromTemplate({
			files: templateRecord.files as Record<string, string>,
			data: resumeData,
			metadata: templateRecord.metadata,
			templateId: templateRecord.id,
			baseUrl: process.env.APP_URL ?? "",
		});

		return {
			headers: {
				"content-disposition": `attachment; filename="${filename}"`,
			},
			body: new File([pdfBinary as unknown as BlobPart], filename, { type: "application/pdf" }),
		};
	});
