import { defineDialogRenderer, defineDialogRendererRegistry } from "../renderer-registry";
import { CreateCustomTemplateDialog, DeleteCustomTemplateDialog, UpdateCustomTemplateDialog } from ".";

export const customTemplateDialogRendererRegistry = defineDialogRendererRegistry("custom-template", [
	defineDialogRenderer("custom-template.create", () => <CreateCustomTemplateDialog />),
	defineDialogRenderer("custom-template.update", ({ data }) => <UpdateCustomTemplateDialog data={data} />),
	defineDialogRenderer("custom-template.delete", ({ data }) => <DeleteCustomTemplateDialog data={data} />),
]);
