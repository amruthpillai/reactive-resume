import { fileURLToPath } from "node:url";
import { createVitestProjectConfig } from "../../vitest.shared";

export default createVitestProjectConfig({
	name: "@reactive-resume/ui",
	dirname: fileURLToPath(new URL(".", import.meta.url)),
	environment: "jsdom",
});
