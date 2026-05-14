import { fileURLToPath } from "node:url";
import { createVitestProjectConfig } from "../../vitest.shared";

export default createVitestProjectConfig({
	name: "server",
	dirname: fileURLToPath(new URL(".", import.meta.url)),
});
