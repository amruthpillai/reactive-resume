import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineConfig } from "tsdown";

const rootPackageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf-8")) as {
	version?: string;
};

const shouldExternalizeThirdParty = (id: string) => {
	if (id.startsWith("@reactive-resume/")) return false;
	if (id.startsWith("@/") || id.startsWith(".") || id.startsWith("/") || id.startsWith("\0")) return false;

	return true;
};

const rawFileSuffix = "?raw";

const rawFilePlugin = {
	name: "raw-file",
	resolveId(source: string, importer: string | undefined) {
		if (!source.endsWith(rawFileSuffix)) return;

		const filePath = source.slice(0, -rawFileSuffix.length);
		const resolvedPath = source.startsWith(".") && importer ? resolve(dirname(importer), filePath) : filePath;

		return `${resolvedPath}${rawFileSuffix}`;
	},
	load(id: string) {
		if (!id.endsWith(rawFileSuffix)) return;

		const filePath = id.slice(0, -rawFileSuffix.length);

		return `export default ${JSON.stringify(readFileSync(filePath, "utf-8"))};`;
	},
};

export default defineConfig({
	entry: {
		index: "src/index.ts",
	},
	format: "esm",
	platform: "node",
	target: "node24",
	outDir: "dist",
	clean: true,
	shims: true,
	dts: false,
	define: {
		__APP_VERSION__: JSON.stringify(rootPackageJson.version ?? "0.0.0"),
	},
	outExtensions: () => ({
		js: ".mjs",
	}),
	deps: {
		alwaysBundle: [/^@reactive-resume\//],
		neverBundle: shouldExternalizeThirdParty,
	},
	plugins: [rawFilePlugin],
});
