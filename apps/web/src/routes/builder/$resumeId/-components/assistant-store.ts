import { create } from "zustand/react";

type BuilderAssistantStore = {
	isOpen: boolean;
	setOpen: (isOpen: boolean) => void;
	toggleOpen: () => void;
};

export const useBuilderAssistantStore = create<BuilderAssistantStore>((set) => ({
	isOpen: false,
	setOpen: (isOpen) => set({ isOpen }),
	toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
}));
