import type { WritableDraft } from "immer";

import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { create } from "zustand/react";

import type { AIObservabilityProvider, AIProvider } from "./types";

type TestStatus = "unverified" | "success" | "failure";

type AIObservabilityState = {
  enabled: boolean;
  provider: AIObservabilityProvider;
  providers: {
    laminar: {
      projectApiKey: string;
      baseUrl: string;
      httpPort: string;
      grpcPort: string;
    };
    langsmith: {
      apiKey: string;
      projectName: string;
      endpoint: string;
    };
  };
};

type AIStoreState = {
  enabled: boolean;
  provider: AIProvider;
  model: string;
  apiKey: string;
  baseURL: string;
  testStatus: TestStatus;
  observability: AIObservabilityState;
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
  observability: {
    enabled: false,
    provider: "laminar",
    providers: {
      laminar: {
        projectApiKey: "",
        baseUrl: "",
        httpPort: "",
        grpcPort: "",
      },
      langsmith: {
        apiKey: "",
        projectName: "",
        endpoint: "",
      },
    },
  },
};

function migrateObservabilityState(value: unknown): AIObservabilityState {
  if (!value || typeof value !== "object") return initialState.observability;

  const observability = value as Partial<AIObservabilityState> & {
    projectApiKey?: string;
    baseUrl?: string;
    httpPort?: string;
    grpcPort?: string;
  };

  if ("providers" in observability && observability.providers) {
    return {
      ...initialState.observability,
      ...observability,
      providers: {
        laminar: {
          ...initialState.observability.providers.laminar,
          ...observability.providers.laminar,
        },
        langsmith: {
          ...initialState.observability.providers.langsmith,
          ...observability.providers.langsmith,
        },
      },
    };
  }

  return {
    ...initialState.observability,
    enabled: observability.enabled ?? initialState.observability.enabled,
    provider: observability.provider ?? initialState.observability.provider,
    providers: {
      ...initialState.observability.providers,
      laminar: {
        projectApiKey: observability.projectApiKey ?? "",
        baseUrl: observability.baseUrl ?? "",
        httpPort: observability.httpPort ?? "",
        grpcPort: observability.grpcPort ?? "",
      },
    },
  };
}

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
      version: 1,
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== "object") return persistedState;

        const state = persistedState as Partial<AIStoreState>;

        return {
          ...state,
          observability: migrateObservabilityState(state.observability),
        };
      },
      partialize: (state) => ({
        enabled: state.enabled,
        provider: state.provider,
        model: state.model,
        apiKey: state.apiKey,
        baseURL: state.baseURL,
        testStatus: state.testStatus,
        observability: state.observability,
      }),
    },
  ),
);
