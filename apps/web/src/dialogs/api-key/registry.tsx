import { defineDialogRenderer, defineDialogRendererRegistry } from "../renderer-registry";
import { CreateApiKeyDialog } from "./create";

export const apiKeyDialogRendererRegistry = defineDialogRendererRegistry("api-key", [
	defineDialogRenderer("api-key.create", () => <CreateApiKeyDialog />),
]);
