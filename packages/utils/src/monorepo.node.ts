import { existsSync, realpathSync } from "node:fs";
import { basename, dirname, join } from "node:path";

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

export const getLocalDataDirectory = (cwd = process.cwd()) => {
	const workspaceRoot = findWorkspaceRoot(cwd);
	if (workspaceRoot) return join(workspaceRoot, "data");

	// Production fallback: in the official Docker image cwd is /app/apps/web,
	// but the data volume is mounted at /app/data (two levels up).
	const resolvedCwd = realpathSync(cwd);
	const parentDirectory = dirname(resolvedCwd);
	if (basename(resolvedCwd) === "web" && basename(parentDirectory) === "apps") {
		return join(dirname(parentDirectory), "data");
	}

	return join(resolvedCwd, "data");
};
