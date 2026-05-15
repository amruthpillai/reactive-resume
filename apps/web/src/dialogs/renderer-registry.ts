import type { ReactNode } from "react";
import type { DialogSchema, DialogType } from "./schemas";

export interface DialogRendererEntry<T extends DialogType = DialogType> {
	type: T;
	render: (dialog: Extract<DialogSchema, { type: T }>) => ReactNode;
}

export type AnyDialogRendererEntry = {
	[T in DialogType]: DialogRendererEntry<T>;
}[DialogType];

export interface DialogRendererRegistry {
	domain: string;
	renderers: readonly AnyDialogRendererEntry[];
}

export const defineDialogRenderer = <T extends DialogType>(
	type: T,
	render: (dialog: Extract<DialogSchema, { type: T }>) => ReactNode,
): DialogRendererEntry<T> => ({ type, render });

export const defineDialogRendererRegistry = (
	domain: string,
	renderers: readonly AnyDialogRendererEntry[],
): DialogRendererRegistry => ({ domain, renderers });
