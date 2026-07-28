import type { TsdownPlugin } from "tsdown";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsdown";

const rootPackageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf-8")) as {
	version?: string;
};

const shouldExternalizeThirdParty = (id: string) => {
	if (id.startsWith("@reactive-resume/")) return false;
	if (id.startsWith("@/") || id.startsWith(".") || id.startsWith("/") || id.startsWith("\0")) return false;

	return true;
};

const aiPromptsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../packages/ai/src/prompts");

const promptAssetsPlugin: TsdownPlugin = {
	name: "prompt-assets",
	buildStart() {
		for (const filename of readdirSync(aiPromptsDir)) {
			if (!filename.endsWith(".md")) continue;

			this.emitFile({
				type: "asset",
				fileName: `prompts/${filename}`,
				source: readFileSync(resolve(aiPromptsDir, filename), "utf-8"),
			});
		}
	},
};

export default defineConfig({
	entry: {
		index: "src/index.ts",
		"stylesheet-preflight-worker": "src/workers/stylesheet-preflight.ts",
	},
	format: "esm",
	platform: "node",
	target: "node24",
	outDir: "dist",
	clean: true,
	shims: true,
	dts: false,
	define: { __APP_VERSION__: JSON.stringify(rootPackageJson.version ?? "0.0.0") },
	outExtensions: () => ({ js: ".mjs" }),
	deps: {
		alwaysBundle: [/^@reactive-resume\//],
		neverBundle: shouldExternalizeThirdParty,
	},
	plugins: [promptAssetsPlugin],
});
