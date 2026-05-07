import { fileURLToPath } from "node:url";
import { createVitestProjectConfig } from "../../vitest.shared";

export default createVitestProjectConfig({
	name: "@reactive-resume/auth",
	dirname: fileURLToPath(new URL(".", import.meta.url)),
});
