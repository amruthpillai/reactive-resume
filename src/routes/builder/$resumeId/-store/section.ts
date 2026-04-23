import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { create } from "zustand/react";

import {
  leftSidebarSections,
  rightSidebarSections,
  type LeftSidebarSection,
  type SidebarSection,
} from "@/utils/resume/section";

type SectionState = {
  collapsed: boolean;
  hidden?: boolean;
};

type SectionCollapseState = {
  [id in SidebarSection]?: SectionState;
};

type SectionStoreState = {
  sections: SectionCollapseState;
};

type SectionStoreActions = {
  setCollapsed: (id: SidebarSection, collapsed: boolean) => void;
  setHidden: (id: LeftSidebarSection, hidden: boolean) => void;
  toggleCollapsed: (id: SidebarSection) => void;
  toggleHidden: (id: LeftSidebarSection) => void;
  toggleAll: () => void;
};

type SectionStore = SectionStoreState & SectionStoreActions;

export const useSectionStore = create<SectionStore>()(
  persist(
    immer((set) => ({
      sections: {},
      setCollapsed: (id, collapsed) => {
        set((state) => {
          state.sections[id] = {
            collapsed,
            hidden: state.sections[id]?.hidden ?? false,
          };
        });
      },
      setHidden: (id, hidden) => {
        set((state) => {
          const current = state.sections[id];
          state.sections[id] = {
            collapsed: current?.collapsed ?? false,
            hidden,
          };
        });
      },
      toggleCollapsed: (id) => {
        set((state) => {
          const current = state.sections[id];
          state.sections[id] = {
            collapsed: !(current?.collapsed ?? false),
            hidden: current?.hidden ?? false,
          };
        });
      },
      toggleHidden: (id) => {
        set((state) => {
          const current = state.sections[id];
          state.sections[id] = {
            collapsed: current?.collapsed ?? false,
            hidden: !(current?.hidden ?? false),
          };
        });
      },
      toggleAll: () => {
        set((state) => {
          [...leftSidebarSections, ...rightSidebarSections].forEach((id) => {
            const current = state.sections[id];
            state.sections[id] = {
              collapsed: !(current?.collapsed ?? false),
              hidden: current?.hidden ?? false,
            };
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
