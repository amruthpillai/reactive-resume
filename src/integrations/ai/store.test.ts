import { afterEach, describe, expect, it } from "vite-plus/test";

import { useAIStore } from "./store";

// ---------------------------------------------------------------------------
// Reset store between tests
// ---------------------------------------------------------------------------

afterEach(() => {
  useAIStore.getState().reset();
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("AI Store — initial state", () => {
  it("starts with default values", () => {
    const state = useAIStore.getState();
    expect(state.enabled).toBe(false);
    expect(state.provider).toBe("openai");
    expect(state.model).toBe("");
    expect(state.apiKey).toBe("");
    expect(state.baseURL).toBe("");
    expect(state.testStatus).toBe("unverified");
    expect(state.observability).toEqual({
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
    });
  });
});

// ---------------------------------------------------------------------------
// set()
// ---------------------------------------------------------------------------

describe("AI Store — set()", () => {
  it("updates provider", () => {
    useAIStore.getState().set((draft) => {
      draft.provider = "anthropic";
    });
    expect(useAIStore.getState().provider).toBe("anthropic");
  });

  it("updates model and apiKey", () => {
    useAIStore.getState().set((draft) => {
      draft.model = "gpt-4";
      draft.apiKey = "sk-test-key";
    });
    expect(useAIStore.getState().model).toBe("gpt-4");
    expect(useAIStore.getState().apiKey).toBe("sk-test-key");
  });

  it("resets testStatus to unverified when provider changes", () => {
    // First set testStatus to success
    useAIStore.getState().set((draft) => {
      draft.testStatus = "success";
    });
    // Now change provider — should reset
    useAIStore.getState().set((draft) => {
      draft.provider = "gemini";
    });
    expect(useAIStore.getState().testStatus).toBe("unverified");
  });

  it("resets testStatus to unverified when model changes", () => {
    useAIStore.getState().set((draft) => {
      draft.testStatus = "success";
    });
    useAIStore.getState().set((draft) => {
      draft.model = "new-model";
    });
    expect(useAIStore.getState().testStatus).toBe("unverified");
  });

  it("resets testStatus to unverified when apiKey changes", () => {
    useAIStore.getState().set((draft) => {
      draft.testStatus = "success";
    });
    useAIStore.getState().set((draft) => {
      draft.apiKey = "new-key";
    });
    expect(useAIStore.getState().testStatus).toBe("unverified");
  });

  it("resets testStatus to unverified when baseURL changes", () => {
    useAIStore.getState().set((draft) => {
      draft.testStatus = "success";
    });
    useAIStore.getState().set((draft) => {
      draft.baseURL = "https://new-url.com";
    });
    expect(useAIStore.getState().testStatus).toBe("unverified");
  });

  it("disables when config changes", () => {
    useAIStore.getState().set((draft) => {
      draft.testStatus = "success";
    });
    useAIStore.getState().setEnabled(true);
    expect(useAIStore.getState().enabled).toBe(true);

    // Change provider — should disable
    useAIStore.getState().set((draft) => {
      draft.provider = "ollama";
    });
    expect(useAIStore.getState().enabled).toBe(false);
  });

  it("does NOT reset testStatus when non-config fields change", () => {
    useAIStore.getState().set((draft) => {
      draft.testStatus = "success";
    });
    // Changing testStatus itself shouldn't trigger the reset logic
    // (since provider/model/apiKey/baseURL didn't change)
    expect(useAIStore.getState().testStatus).toBe("success");
  });
});

// ---------------------------------------------------------------------------
// canEnable()
// ---------------------------------------------------------------------------

describe("AI Store — canEnable()", () => {
  it("returns false when testStatus is unverified", () => {
    expect(useAIStore.getState().canEnable()).toBe(false);
  });

  it("returns false when testStatus is failure", () => {
    useAIStore.getState().set((draft) => {
      draft.testStatus = "failure";
    });
    expect(useAIStore.getState().canEnable()).toBe(false);
  });

  it("returns true when testStatus is success", () => {
    useAIStore.getState().set((draft) => {
      draft.testStatus = "success";
    });
    expect(useAIStore.getState().canEnable()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// setEnabled()
// ---------------------------------------------------------------------------

describe("AI Store — setEnabled()", () => {
  it("enables when testStatus is success", () => {
    useAIStore.getState().set((draft) => {
      draft.testStatus = "success";
    });
    useAIStore.getState().setEnabled(true);
    expect(useAIStore.getState().enabled).toBe(true);
  });

  it("refuses to enable when testStatus is not success", () => {
    useAIStore.getState().setEnabled(true);
    expect(useAIStore.getState().enabled).toBe(false);
  });

  it("can disable regardless of testStatus", () => {
    useAIStore.getState().set((draft) => {
      draft.testStatus = "success";
    });
    useAIStore.getState().setEnabled(true);
    expect(useAIStore.getState().enabled).toBe(true);

    useAIStore.getState().setEnabled(false);
    expect(useAIStore.getState().enabled).toBe(false);
  });

  it("refuses to enable after failure", () => {
    useAIStore.getState().set((draft) => {
      draft.testStatus = "failure";
    });
    useAIStore.getState().setEnabled(true);
    expect(useAIStore.getState().enabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// reset()
// ---------------------------------------------------------------------------

describe("AI Store — reset()", () => {
  it("restores all state to initial values", () => {
    useAIStore.getState().set((draft) => {
      draft.provider = "anthropic";
      draft.model = "claude-3";
      draft.apiKey = "sk-key";
      draft.baseURL = "https://api.anthropic.com";
      draft.testStatus = "success";
      draft.observability.enabled = true;
      draft.observability.providers.laminar.projectApiKey = "lmnr-project-key";
      draft.observability.providers.laminar.baseUrl = "http://localhost";
      draft.observability.providers.laminar.httpPort = "8000";
      draft.observability.providers.laminar.grpcPort = "8001";
    });
    useAIStore.getState().setEnabled(true);

    useAIStore.getState().reset();

    const state = useAIStore.getState();
    expect(state.enabled).toBe(false);
    expect(state.provider).toBe("openai");
    expect(state.model).toBe("");
    expect(state.apiKey).toBe("");
    expect(state.baseURL).toBe("");
    expect(state.testStatus).toBe("unverified");
    expect(state.observability).toEqual({
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
    });
  });
});
