import z from "zod";

import { protectedProcedure } from "../context";
import { pdfExportRateLimit } from "../rate-limit";
import { printerService } from "../services/printer";
import { resumeService } from "../services/resume";

async function getResumeScreenshotUrl(input: { id: string; currentUserId: string }): Promise<string | null> {
  try {
    const { id, data, userId, updatedAt } = await resumeService.getByIdForPrinter(input);
    return await printerService.getResumeScreenshot({ id, data, userId, updatedAt });
  } catch {
    // ignore errors, as the screenshot is not critical
    return null;
  }
}

export const printerRouter = {
  printResumeAsPDF: protectedProcedure
    .route({
      method: "GET",
      path: "/resumes/{id}/pdf",
      tags: ["Resume Export"],
      operationId: "exportResumePdf",
      summary: "Export resume as PDF",
      description:
        "Generates a PDF from the specified resume and uploads it to storage. Returns a URL to download the generated PDF file. Requires authentication.",
      successDescription: "The PDF was generated successfully. Returns a URL to download the file.",
    })
    .input(z.object({ id: z.string().describe("The unique identifier of the resume to export.") }))
    .use(pdfExportRateLimit)
    .output(z.object({ url: z.string().describe("The URL to download the generated PDF file.") }))
    .handler(async ({ input, context }) => {
      const { id, data, userId } = await resumeService.getByIdForPrinter({
        id: input.id,
        currentUserId: context.user.id,
      });
      const url = await printerService.printResumeAsPDF({ id, data, userId });

      return { url };
    }),

  getResumeScreenshot: protectedProcedure
    .route({
      method: "GET",
      path: "/resumes/{id}/screenshot",
      tags: ["Resume Export"],
      operationId: "getResumeScreenshot",
      summary: "Get resume screenshot",
      description:
        "Returns a URL to a screenshot image of the first page of the specified resume. Screenshots are cached for up to 6 hours and regenerated automatically when the resume is updated. Returns null if the screenshot cannot be generated. Requires authentication.",
      successDescription: "The screenshot URL, or null if the screenshot could not be generated.",
    })
    .input(z.object({ id: z.string().describe("The unique identifier of the resume.") }))
    .output(z.object({ url: z.string().nullable().describe("The URL to the screenshot image, or null.") }))
    .handler(async ({ context, input }) => {
      const url = await getResumeScreenshotUrl({ id: input.id, currentUserId: context.user.id });
      return { url };
    }),
};
