import type { Layout, usePanelRef } from "react-resizable-panels";
import { useCallback, useMemo } from "react";
import { useWindowSize } from "usehooks-ts";
import { create } from "zustand/react";
import { useIsMobile } from "@/hooks/use-mobile";

type PanelImperativeHandle = ReturnType<typeof usePanelRef>;

export const BUILDER_LAYOUT_COOKIE_NAME = "builder_layout";

export type BuilderLayout = {
	left: number;
	artboard: number;
	right: number;
};

export const DEFAULT_BUILDER_LAYOUT: BuilderLayout = {
	left: 22,
	artboard: 56,
	right: 22,
};

export const DESKTOP_BUILDER_SIDEBAR_COLLAPSED_SIZE = 48;
export const DESKTOP_BUILDER_SIDEBAR_MIN_SIZE = 320;

type BuilderSidebarResizeConfigInput = {
	isMobile: boolean;
	width: number;
};

export const getBuilderSidebarResizeConfig = ({ isMobile, width }: BuilderSidebarResizeConfigInput) => ({
	maxSidebarSize: !width ? 0 : isMobile ? "95%" : "45%",
	minSidebarSize: !width ? 0 : isMobile ? 0 : DESKTOP_BUILDER_SIDEBAR_MIN_SIZE,
	collapsedSidebarSize: !width ? 0 : isMobile ? 0 : DESKTOP_BUILDER_SIDEBAR_COLLAPSED_SIZE,
	expandSize: isMobile ? "95%" : "30%",
	groupResizeBehavior: "preserve-pixel-size" as const,
});

export const mapPanelLayoutToBuilderLayout = (layout: Layout): BuilderLayout => {
	const left = layout.left;
	const artboard = layout.artboard;
	const right = layout.right;

	if (typeof left !== "number" || typeof artboard !== "number" || typeof right !== "number")
		return DEFAULT_BUILDER_LAYOUT;

	return { left, artboard, right };
};

export const parseBuilderLayoutCookie = (value?: string | null): BuilderLayout => {
	if (!value) return DEFAULT_BUILDER_LAYOUT;

	try {
		const parsed = JSON.parse(value);

		if (Array.isArray(parsed)) return DEFAULT_BUILDER_LAYOUT;
		if (typeof parsed !== "object" || parsed === null) return DEFAULT_BUILDER_LAYOUT;

		const left = (parsed as { left?: unknown }).left;
		const artboard = (parsed as { artboard?: unknown }).artboard;
		const right = (parsed as { right?: unknown }).right;

		if (typeof left !== "number" || typeof artboard !== "number" || typeof right !== "number")
			return DEFAULT_BUILDER_LAYOUT;

		return { left, artboard, right };
	} catch {
		return DEFAULT_BUILDER_LAYOUT;
	}
};

interface BuilderSidebarState {
	layout: BuilderLayout;
	leftSidebar: PanelImperativeHandle | null;
	rightSidebar: PanelImperativeHandle | null;
}

interface BuilderSidebarActions {
	setLayout: (layout: BuilderLayout) => void;
	setLeftSidebar: (ref: PanelImperativeHandle | null) => void;
	setRightSidebar: (ref: PanelImperativeHandle | null) => void;
}

type BuilderSidebar = BuilderSidebarState & BuilderSidebarActions;

export const useBuilderSidebarStore = create<BuilderSidebar>((set) => ({
	layout: DEFAULT_BUILDER_LAYOUT,
	leftSidebar: null,
	rightSidebar: null,
	setLayout: (layout) => set({ layout }),
	setLeftSidebar: (ref) => set({ leftSidebar: ref }),
	setRightSidebar: (ref) => set({ rightSidebar: ref }),
}));

type UseBuilderSidebarReturn = {
	maxSidebarSize: string | number;
	minSidebarSize: number;
	collapsedSidebarSize: number;
	groupResizeBehavior: "preserve-pixel-size";
	isCollapsed: (side: "left" | "right") => boolean;
	toggleSidebar: (side: "left" | "right", forceState?: boolean) => void;
};

export function useBuilderSidebar<T = UseBuilderSidebarReturn>(selector?: (builder: UseBuilderSidebarReturn) => T): T {
	const isMobile = useIsMobile();
	const { width } = useWindowSize();

	const { maxSidebarSize, minSidebarSize, collapsedSidebarSize, expandSize, groupResizeBehavior } =
		getBuilderSidebarResizeConfig({ isMobile, width });

	const isCollapsed = useCallback((side: "left" | "right") => {
		const sidebar =
			side === "left"
				? useBuilderSidebarStore.getState().leftSidebar?.current
				: useBuilderSidebarStore.getState().rightSidebar?.current;

		if (!sidebar) return false;
		return sidebar.isCollapsed();
	}, []);

	const toggleSidebar = useCallback(
		(side: "left" | "right", forceState?: boolean) => {
			const sidebar =
				side === "left"
					? useBuilderSidebarStore.getState().leftSidebar?.current
					: useBuilderSidebarStore.getState().rightSidebar?.current;

			if (!sidebar) return;

			const shouldExpand = forceState === undefined ? sidebar.isCollapsed() : forceState;

			if (shouldExpand) sidebar.resize(expandSize);
			else sidebar.collapse();
		},
		[expandSize],
	);

	const state = useMemo(() => {
		return {
			maxSidebarSize,
			minSidebarSize,
			collapsedSidebarSize,
			groupResizeBehavior,
			isCollapsed,
			toggleSidebar,
		};
	}, [maxSidebarSize, minSidebarSize, collapsedSidebarSize, groupResizeBehavior, isCollapsed, toggleSidebar]);

	return selector ? selector(state) : (state as T);
}
