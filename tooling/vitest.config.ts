import { fileURLToPath } from "node:url";
// @boundaries-ignore root shared Vitest config
import { createVitestProjectConfig } from "../vitest.shared.mts";

const config = createVitestProjectConfig({
	name: "@reactive-resume/tooling",
	dirname: fileURLToPath(new URL(".", import.meta.url)),
});

export default {
	...config,
	test: { ...config.test, include: ["**/*.{test,spec}.?(c|m)[jt]s?(x)"] },
	oxc: { jsx: { runtime: "automatic" as const } },
};
