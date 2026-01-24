import { publicProcedure } from "../context";
import { type FeatureFlags, flagsService } from "../services/flags";

export const flagsRouter = {
	get: publicProcedure
		.route({
			method: "GET",
			path: "/flags",
			tags: ["Feature Flags"],
			summary: "Get feature flags",
			description: "Returns the current feature flags for this instance.",
		})
		.handler((): FeatureFlags => flagsService.getFlags()),
};
