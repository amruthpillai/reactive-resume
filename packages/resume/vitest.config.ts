import { fileURLToPath } from "node:url";
// @boundaries-ignore root shared Vitest config
import { createVitestProjectConfig } from "../../vitest.shared";

export default createVitestProjectConfig({
	name: "@reactive-resume/resume",
	dirname: fileURLToPath(new URL(".", import.meta.url)),
});
