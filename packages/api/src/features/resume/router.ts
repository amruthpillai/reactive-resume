import { analysisRouter } from "./analysis";
import { crudRouter } from "./crud";
import { updatesRouter } from "./event-router";
import { sharingRouter } from "./sharing";
import { resumeStatisticsRouter } from "./statistics";
import { tagsRouter } from "./tags";
import { versionsRouter } from "./versions";

export const resumeRouter = {
	tags: tagsRouter,
	statistics: resumeStatisticsRouter,
	analysis: analysisRouter,
	updates: updatesRouter,

	list: crudRouter.list,
	getById: crudRouter.getById,
	getBySlug: sharingRouter.getBySlug,
	create: crudRouter.create,
	import: crudRouter.import,
	update: crudRouter.update,
	patch: crudRouter.patch,
	setLocked: crudRouter.setLocked,
	setPassword: sharingRouter.setPassword,
	verifyPassword: sharingRouter.verifyPassword,
	removePassword: sharingRouter.removePassword,
	duplicate: crudRouter.duplicate,
	delete: crudRouter.delete,
	listVersions: versionsRouter.listVersions,
	restoreVersion: versionsRouter.restoreVersion,
};
