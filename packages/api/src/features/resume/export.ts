import type { ResumeExportTarget } from "@reactive-resume/resume/export-sections";
import { ORPCError } from "@orpc/server";
import z from "zod";
import { createResumePdfFile } from "@reactive-resume/pdf/server";
import { getResumeExportData, resumeHasCoverLetter } from "@reactive-resume/resume/export-sections";
import { generateFilename } from "@reactive-resume/utils/file";
import { protectedProcedure } from "../../context";
import { pdfExportRateLimit } from "../../middleware/rate-limit";
import { resumeService } from "./service";

export {
	createResumePdfDownloadUrl,
	MAX_PDF_DOWNLOAD_URL_TTL_SECONDS,
	verifyResumePdfDownloadToken,
} from "./pdf-download-url";

type CreateResumePdfDownloadInput = {
	id: string;
	userId: string;
	target?: ResumeExportTarget;
};

export async function createResumePdfDownload(input: CreateResumePdfDownloadInput) {
	const resume = await resumeService.getById({ id: input.id, userId: input.userId });
	const target = input.target ?? "resume";
	if (target === "cover-letter" && !resumeHasCoverLetter(resume.data)) {
		throw new ORPCError("NOT_FOUND", { message: "No cover letter found for this resume" });
	}

	const filename = generateFilename(target === "cover-letter" ? `${resume.name} Cover Letter` : resume.name, "pdf");

	try {
		const body = await createResumePdfFile({ data: getResumeExportData(resume.data, target), filename });

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
}

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
	.input(
		z.object({
			id: z.string().describe("The ID of the resume."),
			target: z.enum(["resume", "cover-letter"]).optional().describe("Which document to download."),
		}),
	)
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
		return createResumePdfDownload({
			id: input.id,
			userId: context.user.id,
			...(input.target ? { target: input.target } : {}),
		});
	});
