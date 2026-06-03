import type { Layout, usePanelRef } from "react-resizable-panels";

type PanelImperativeHandle = ReturnType<typeof usePanelRef>;

import { create } from "zustand/react";

export type EditorLayout = { left: number; canvas: number; right: number };

export const DEFAULT_EDITOR_LAYOUT: EditorLayout = { left: 0, canvas: 78, right: 22 };

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

type EditorSidebarState = {
	layout: EditorLayout;
	rightSidebar: PanelImperativeHandle | null;
};

type EditorSidebarActions = {
	setLayout: (layout: EditorLayout) => void;
	setRightSidebar: (ref: PanelImperativeHandle) => void;
	toggleRightSidebar: (open?: boolean) => void;
};

type EditorSidebarStore = EditorSidebarState & EditorSidebarActions;

export const useEditorSidebarStore = create<EditorSidebarStore>((set, get) => ({
	layout: DEFAULT_EDITOR_LAYOUT,
	rightSidebar: null,

	setLayout: (layout) => set({ layout }),
	setRightSidebar: (ref) => set({ rightSidebar: ref }),
	toggleRightSidebar: (open) => {
		const { rightSidebar } = get();
		if (!rightSidebar) return;
		if (open !== undefined) {
			open ? rightSidebar.expand() : rightSidebar.collapse();
		} else {
			rightSidebar.isCollapsed() ? rightSidebar.expand() : rightSidebar.collapse();
		}
	},
}));
