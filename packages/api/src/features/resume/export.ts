import type { ResumeExportTarget } from "@reactive-resume/resume/export-sections";
import { ORPCError } from "@orpc/server";
import z from "zod";
import { getResumeExportData, resumeHasCoverLetter } from "@reactive-resume/resume/export-sections";
import { generateFilename } from "@reactive-resume/utils/file";
import { protectedProcedure } from "../../context";
import { pdfExportRateLimit } from "../../middleware/rate-limit";
import { parseStoredResumeData } from "./resume-data-validation";
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
	const data = parseStoredResumeData(resume.data);
	const target = input.target ?? "resume";
	if (target === "cover-letter" && !resumeHasCoverLetter(data)) {
		throw new ORPCError("NOT_FOUND", { message: "No cover letter found for this resume" });
	}

	const filename = generateFilename(target === "cover-letter" ? `${resume.name} Cover Letter` : resume.name, "pdf");

	try {
		// Lazy-load the PDF renderer (@reactive-resume/pdf → @react-pdf/renderer +
		// phosphor-icons-react-pdf, ~10.6k icon modules) only when a PDF is actually
		// exported, instead of at server boot. Slashes cold-start file I/O on
		// constrained/slow-disk hosts. See fork perf/lazy-load-pdf.
		const { createResumePdfFile } = await import("@reactive-resume/pdf/server");
		const body = await createResumePdfFile({ data: getResumeExportData(data, target), filename });

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
	.handler(({ context, input }) =>
		createResumePdfDownload({
			id: input.id,
			userId: context.user.id,
			...(input.target ? { target: input.target } : {}),
		}),
	);
