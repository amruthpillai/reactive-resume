import type { DialogSchema } from "./schemas";
import { apiKeyDialogRendererRegistry } from "./api-key/registry";
import { authDialogRendererRegistry } from "./auth/registry";
import { customTemplateDialogRendererRegistry } from "./custom-template/registry";
import { resumeDialogRendererRegistry } from "./resume/registry";

const dialogRendererRegistries = [
	authDialogRendererRegistry,
	apiKeyDialogRendererRegistry,
	resumeDialogRendererRegistry,
	customTemplateDialogRendererRegistry,
] as const;

const dialogRendererByType = new Map(
	dialogRendererRegistries.flatMap((registry) =>
		registry.renderers.map((renderer) => [renderer.type, renderer] as const),
	),
);

export const renderDialog = (dialog: DialogSchema | null) => {
	if (!dialog) return null;

	const renderer = dialogRendererByType.get(dialog.type);
	if (renderer) return renderer.render(dialog as never);

	return null;
};
