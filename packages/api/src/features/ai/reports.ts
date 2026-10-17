import z from "zod";
import { db } from "@reactive-resume/db/client";
import { aiContentReport } from "@reactive-resume/db/schema";
import { protectedProcedure } from "../../context";
import { storageUploadRateLimit } from "../../middleware/rate-limit";

export const reportAiContent = protectedProcedure
	.route({
		method: "POST",
		path: "/ai/content-reports",
		tags: ["AI"],
		operationId: "reportAiContent",
		summary: "Report unsafe AI-generated or publicly shared resume content to the server operator",
		description:
			"Privately stores only the content and explanation the user submits. Does not send a report to an AI provider. Reports are deleted with the reporting account.",
	})
	.input(
		z.object({
			source: z.enum(["assistant", "writing", "letter", "career", "import", "public-resume", "other"]),
			reason: z.enum(["hate", "sexual", "violence", "dangerous", "other"]),
			content: z.string().trim().min(1).max(20_000),
			note: z.string().trim().max(1_000).default(""),
		}),
	)
	.output(z.object({ id: z.string() }))
	.use(storageUploadRateLimit)
	.handler(async ({ context, input }) => {
		const [report] = await db
			.insert(aiContentReport)
			.values({ ...input, userId: context.user.id })
			.returning({ id: aiContentReport.id });
		if (!report) throw new Error("Could not store the content report.");
		return report;
	});
