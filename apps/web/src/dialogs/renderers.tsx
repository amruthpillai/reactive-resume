import type { DialogSchema } from "./schemas";
import { apiKeyDialogRendererRegistry } from "./api-key/registry";
import { authDialogRendererRegistry } from "./auth/registry";
import { resumeDialogRendererRegistry } from "./resume/registry";

const dialogRendererRegistries = [
	authDialogRendererRegistry,
	apiKeyDialogRendererRegistry,
	resumeDialogRendererRegistry,
] as const;

export const renderDialog = (dialog: DialogSchema | null) => {
	if (!dialog) return null;

	for (const registry of dialogRendererRegistries) {
		const renderer = registry.renderers.find((entry) => entry.type === dialog.type);
		if (renderer) return renderer.render(dialog as never);
	}

	return null;
};
