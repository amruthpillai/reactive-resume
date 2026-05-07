import { fileURLToPath } from "node:url";
import { createVitestProjectConfig } from "../../vitest.shared";

export default createVitestProjectConfig({
	name: "@reactive-resume/pdf",
	dirname: fileURLToPath(new URL(".", import.meta.url)),
});
