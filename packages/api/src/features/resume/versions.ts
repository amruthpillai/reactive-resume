import { protectedProcedure } from "../../context";
import { resumeDto } from "../../dto/resume";
import { resumeMutationRateLimit } from "../../middleware/rate-limit";
import { resumeService } from "./service";

export const versionsRouter = {
	listVersions: protectedProcedure
		.route({
			method: "GET",
			path: "/resumes/{resumeId}/versions",
			tags: ["Resumes"],
			operationId: "listResumeVersions",
			summary: "List resume version history",
			description:
				"Returns the recent version-history snapshots for a resume (id, label, and timestamp only). Snapshots are taken at milestones such as imports, AI edits, and periodic manual saves. Only the resume owner can list versions. Requires authentication.",
			successDescription: "A list of recent version snapshots, newest first.",
		})
		.input(resumeDto.listVersions.input)
		.output(resumeDto.listVersions.output)
		.handler(async ({ context, input }) => {
			return resumeService.versions.list({ resumeId: input.resumeId, userId: context.user.id });
		}),

	restoreVersion: protectedProcedure
		.route({
			method: "POST",
			path: "/resumes/{resumeId}/versions/{versionId}/restore",
			tags: ["Resumes"],
			operationId: "restoreResumeVersion",
			summary: "Restore a resume version",
			description:
				"Non-destructively restores a resume to a previous version snapshot by writing that snapshot's data back through the normal update path. Prior versions are preserved and the restore itself becomes a new snapshot. Only the resume owner can restore versions. Requires authentication.",
			successDescription: "The restored resume with its full data.",
		})
		.input(resumeDto.restoreVersion.input)
		.use(resumeMutationRateLimit)
		.output(resumeDto.restoreVersion.output)
		.handler(async ({ context, input }) => {
			return resumeService.versions.restore({
				resumeId: input.resumeId,
				versionId: input.versionId,
				userId: context.user.id,
			});
		}),
};
