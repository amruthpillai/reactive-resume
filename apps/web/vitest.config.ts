import { fileURLToPath } from "node:url";
import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { createVitestProjectConfig } from "../../vitest.shared";

export default createVitestProjectConfig({
	name: "web",
	dirname: fileURLToPath(new URL(".", import.meta.url)),
	plugins: [tailwindcss(), lingui(), babel({ presets: [linguiTransformerBabelPreset()] })],
});
