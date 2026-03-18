import { aiRouter } from "./ai";
import { authRouter } from "./auth";
import { flagsRouter } from "./flags";
import { jobsRouter } from "./jobs";
import { printerRouter } from "./printer";
import { resumeRouter } from "./resume";
import { statisticsRouter } from "./statistics";
import { storageRouter } from "./storage";

export default {
  ai: aiRouter,
  auth: authRouter,
  flags: flagsRouter,
  jobs: jobsRouter,
  printer: printerRouter,
  resume: resumeRouter,
  statistics: statisticsRouter,
  storage: storageRouter,
};
