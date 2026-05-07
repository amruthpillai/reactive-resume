import { fileURLToPath } from "node:url";
import { createVitestProjectConfig } from "../../vitest.shared";

export default createVitestProjectConfig({
	name: "@reactive-resume/env",
	dirname: fileURLToPath(new URL(".", import.meta.url)),
});
