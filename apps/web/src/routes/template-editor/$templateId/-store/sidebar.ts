import type { Layout, usePanelRef } from "react-resizable-panels";

type PanelImperativeHandle = ReturnType<typeof usePanelRef>;

import { create } from "zustand/react";

export type EditorLayout = { left: number; canvas: number; right: number };

export const DEFAULT_EDITOR_LAYOUT: EditorLayout = { left: 19, canvas: 55, right: 26 };

export const parseEditorLayoutCookie = (value: string): EditorLayout => {
	try {
		const parsed = JSON.parse(value) as unknown;
		if (typeof parsed === "object" && parsed !== null && "left" in parsed && "canvas" in parsed && "right" in parsed) {
			return parsed as EditorLayout;
		}
	} catch {}
	return DEFAULT_EDITOR_LAYOUT;
};

export const mapPanelLayoutToEditorLayout = (layout: Layout): EditorLayout => ({
	left: layout[0] ?? DEFAULT_EDITOR_LAYOUT.left,
	canvas: layout[1] ?? DEFAULT_EDITOR_LAYOUT.canvas,
	right: layout[2] ?? DEFAULT_EDITOR_LAYOUT.right,
});

export const EDITOR_LAYOUT_COOKIE_NAME = "template-editor-layout";

export type EditorViewMode = "edit" | "preview";

type EditorSidebarState = {
	layout: EditorLayout;
	leftSidebar: PanelImperativeHandle | null;
	rightSidebar: PanelImperativeHandle | null;
	viewMode: EditorViewMode;
};

type EditorSidebarActions = {
	setLayout: (layout: EditorLayout) => void;
	setLeftSidebar: (ref: PanelImperativeHandle) => void;
	setRightSidebar: (ref: PanelImperativeHandle) => void;
	toggleLeftSidebar: (open?: boolean) => void;
	toggleRightSidebar: (open?: boolean) => void;
	setViewMode: (mode: EditorViewMode) => void;
};

type EditorSidebarStore = EditorSidebarState & EditorSidebarActions;

const togglePanel = (panel: PanelImperativeHandle | null, open?: boolean) => {
	// `usePanelRef()` returns a RefObject; the imperative API is on `.current`.
	const handle = panel?.current;
	if (!handle) return;
	if (open !== undefined) {
		open ? handle.expand() : handle.collapse();
	} else {
		handle.isCollapsed() ? handle.expand() : handle.collapse();
	}
};

export const useEditorSidebarStore = create<EditorSidebarStore>((set, get) => ({
	layout: DEFAULT_EDITOR_LAYOUT,
	leftSidebar: null,
	rightSidebar: null,
	viewMode: "edit",

	setLayout: (layout) => set({ layout }),
	setLeftSidebar: (ref) => set({ leftSidebar: ref }),
	setRightSidebar: (ref) => set({ rightSidebar: ref }),
	toggleLeftSidebar: (open) => togglePanel(get().leftSidebar, open),
	toggleRightSidebar: (open) => togglePanel(get().rightSidebar, open),
	setViewMode: (viewMode) => set({ viewMode }),
}));
