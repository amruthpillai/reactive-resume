import type { SidebarSection } from "@/libs/resume/section";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { create } from "zustand/react";
import { leftSidebarSections, rightSidebarSections } from "@/libs/resume/section";

type SectionCollapseState = {
	[id in SidebarSection]?: { collapsed: boolean };
};

type SectionStoreState = {
	sections: SectionCollapseState;
};

type SectionStoreActions = {
	setCollapsed: (id: SidebarSection, collapsed: boolean) => void;
	toggleCollapsed: (id: SidebarSection) => void;
	toggleAll: () => void;
};

type SectionStore = SectionStoreState & SectionStoreActions;

export const useSectionStore = create<SectionStore>()(
	persist(
		immer((set) => ({
			sections: {},
			setCollapsed: (id, collapsed) => {
				set((state) => {
					state.sections[id] = { collapsed };
				});
			},
			toggleCollapsed: (id) => {
				set((state) => {
					const current = state.sections[id]?.collapsed ?? false;
					state.sections[id] = { collapsed: !current };
				});
			},
			toggleAll: () => {
				set((state) => {
					[...leftSidebarSections, ...rightSidebarSections].forEach((id) => {
						const current = state.sections[id]?.collapsed ?? false;
						state.sections[id] = { collapsed: !current };
					});
				});
			},
		})),
		{
			name: "section-store",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				sections: state.sections,
			}),
		},
	),
);
