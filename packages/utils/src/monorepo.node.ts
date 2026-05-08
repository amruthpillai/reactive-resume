import { existsSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";

export const findWorkspaceRoot = (cwd = process.cwd()) => {
	let currentDirectory = realpathSync(cwd);

	while (true) {
		const workspaceManifestPath = join(currentDirectory, "pnpm-workspace.yaml");
		if (existsSync(workspaceManifestPath)) return currentDirectory;

		const parentDirectory = dirname(currentDirectory);
		if (parentDirectory === currentDirectory) return null;

		currentDirectory = parentDirectory;
	}
};

export const getLocalDataDirectory = (overridePath?: string, cwd = process.cwd()) => {
	if (overridePath) return overridePath;

	const workspaceRoot = findWorkspaceRoot(cwd);
	return join(workspaceRoot ?? realpathSync(cwd), "data");
};
