import type { WritableDraft } from "immer";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { create } from "zustand/react";

export type AIProvider = "vercel-ai-gateway" | "openai" | "gemini" | "anthropic" | "ollama";

type TestStatus = "unverified" | "success" | "failure";

type AIStoreState = {
	enabled: boolean;
	provider: AIProvider;
	model: string;
	apiKey: string;
	baseURL: string;
	testStatus: TestStatus;
};

type AIStoreActions = {
	canEnable: () => boolean;
	setEnabled: (value: boolean) => void;
	set: (fn: (draft: WritableDraft<AIStoreState>) => void) => void;
	reset: () => void;
};

type AIStore = AIStoreState & AIStoreActions;

const initialState: AIStoreState = {
	enabled: false,
	provider: "openai",
	model: "",
	apiKey: "",
	baseURL: "",
	testStatus: "unverified",
};

export const useAIStore = create<AIStore>()(
	persist(
		immer((set, get) => ({
			...initialState,
			set: (fn) => {
				set((draft) => {
					const prev = {
						provider: draft.provider,
						model: draft.model,
						apiKey: draft.apiKey,
						baseURL: draft.baseURL,
					};

					fn(draft);

					if (
						draft.provider !== prev.provider ||
						draft.model !== prev.model ||
						draft.apiKey !== prev.apiKey ||
						draft.baseURL !== prev.baseURL
					) {
						draft.testStatus = "unverified";
						draft.enabled = false;
					}
				});
			},
			reset: () => set(() => initialState),
			canEnable: () => {
				const { testStatus } = get();
				return testStatus === "success";
			},
			setEnabled: (value: boolean) => {
				const canEnable = get().canEnable();
				if (value && !canEnable) return;
				set((draft) => {
					draft.enabled = value;
				});
			},
		})),
		{
			name: "ai-store",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				enabled: state.enabled,
				provider: state.provider,
				model: state.model,
				apiKey: state.apiKey,
				baseURL: state.baseURL,
				testStatus: state.testStatus,
			}),
		},
	),
);
