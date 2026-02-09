// @ts-check

const nextPackages = ["@monaco-editor/react"];

const betaPackages = ["vite", "drizzle-orm", "drizzle-kit", "@better-auth/core", "@better-auth/passkey", "better-auth"];

/** @type {import('npm-check-updates').RunOptions} */
module.exports = {
	upgrade: true,
	install: "always",
	packageManager: "pnpm",
	target: (packageName) => {
		if (nextPackages.includes(packageName)) return "@next";
		if (betaPackages.includes(packageName)) return "@beta";
		return "latest";
	},
};
