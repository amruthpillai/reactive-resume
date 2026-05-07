// @ts-check

const betaPackages = ["drizzle-orm", "drizzle-kit", "drizzle-zod"];

/** @type {import('npm-check-updates').RunOptions} */
module.exports = {
	upgrade: true,
	workspaces: true,
	install: "always",
	packageManager: "pnpm",
	target: (packageName) => {
		if (betaPackages.includes(packageName)) return "@beta";
		return "latest";
	},
};
