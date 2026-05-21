import nunjucks from "nunjucks";
import { registerFilters } from "./filters";
import { FileMapLoader } from "./loader";

export const createEnvironment = (files: Record<string, string>): nunjucks.Environment => {
	const env = new nunjucks.Environment(new FileMapLoader(files) as nunjucks.ILoader, {
		autoescape: true,
		trimBlocks: true,
		lstripBlocks: true,
	});

	registerFilters(env);

	return env;
};
