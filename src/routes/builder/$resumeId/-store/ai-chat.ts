import { create } from "zustand/react";

export type AIChatMessage = {
	id: string;
	role: "assistant" | "user";
	content: string;
};

type AIChatState = {
	isOpen: boolean;
	fabVisible: boolean;
	lastInteraction: number | null;
	messages: AIChatMessage[];
};

type AIChatActions = {
	open: () => void;
	close: () => void;
	toggle: () => void;
	hideFab: () => void;
	touch: () => void;
	addMessage: (message: Omit<AIChatMessage, "id"> & { id?: string }) => void;
	resetMessages: () => void;
};

type AIChatStore = AIChatState & AIChatActions;

const createId = () =>
	typeof crypto !== "undefined" && crypto.randomUUID
		? crypto.randomUUID()
		: `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const initialMessages: AIChatMessage[] = [
	{
		id: "welcome",
		role: "assistant",
		content: "Hi! I can help update your resume. Tell me what you want to change.",
	},
];

export const useAIChatStore = create<AIChatStore>((set) => ({
	isOpen: false,
	fabVisible: false,
	lastInteraction: null,
	messages: initialMessages,
	open: () => set(() => ({ isOpen: true, fabVisible: true, lastInteraction: Date.now() })),
	close: () => set(() => ({ isOpen: false, fabVisible: true, lastInteraction: Date.now() })),
	toggle: () => set((state) => ({ isOpen: !state.isOpen, fabVisible: true, lastInteraction: Date.now() })),
	hideFab: () => set(() => ({ fabVisible: false })),
	touch: () => set(() => ({ lastInteraction: Date.now(), fabVisible: true })),
	addMessage: (message) =>
		set((state) => ({
			messages: [...state.messages, { ...message, id: message.id ?? createId() }],
			fabVisible: true,
			lastInteraction: Date.now(),
		})),
	resetMessages: () => set(() => ({ messages: [...initialMessages] })),
}));
