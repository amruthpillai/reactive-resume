import { defineDialogRenderer, defineDialogRendererRegistry } from "../renderer-registry";
import { ImportTemplateDialog } from "./import";

export const templateDialogRendererRegistry = defineDialogRendererRegistry("template", [
	defineDialogRenderer("template.import", () => <ImportTemplateDialog />),
]);
