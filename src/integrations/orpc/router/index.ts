import { aiRouter } from "./ai";
import { authRouter } from "./auth";
import { billingRouter } from "./billing";
import { flagsRouter } from "./flags";
import { printerRouter } from "./printer";
import { resumeRouter } from "./resume";
import { statisticsRouter } from "./statistics";
import { storageRouter } from "./storage";

export default {
	ai: aiRouter,
	auth: authRouter,
	billing: billingRouter,
	flags: flagsRouter,
	resume: resumeRouter,
	storage: storageRouter,
	printer: printerRouter,
	statistics: statisticsRouter,
};
