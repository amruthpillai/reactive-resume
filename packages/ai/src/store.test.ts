// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import { useAIStore } from "./store";

const reset = () => {
	useAIStore.setState({
		enabled: false,
		provider: "openai",
		model: "",
		apiKey: "",
		baseURL: "",
		testStatus: "unverified",
	});
};

afterEach(reset);

describe("useAIStore", () => {
	it("starts with provider=openai and disabled state", () => {
		const state = useAIStore.getState();
		expect(state.enabled).toBe(false);
		expect(state.provider).toBe("openai");
		expect(state.testStatus).toBe("unverified");
	});

	it("set() updates fields and resets verification when credential fields change", () => {
		useAIStore.setState({ testStatus: "success", enabled: true });

		useAIStore.getState().set((draft) => {
			draft.apiKey = "new-key";
		});

		const state = useAIStore.getState();
		expect(state.apiKey).toBe("new-key");
		expect(state.testStatus).toBe("unverified");
		expect(state.enabled).toBe(false);
	});

	it("set() does NOT reset testStatus when changing non-credential fields", () => {
		useAIStore.setState({ testStatus: "success", enabled: true });

		useAIStore.getState().set((draft) => {
			draft.testStatus = "success"; // explicit no-op
		});

		const state = useAIStore.getState();
		expect(state.testStatus).toBe("success");
		expect(state.enabled).toBe(true);
	});

	it("canEnable() is true only when testStatus is success", () => {
		expect(useAIStore.getState().canEnable()).toBe(false);

		useAIStore.setState({ testStatus: "success" });
		expect(useAIStore.getState().canEnable()).toBe(true);

		useAIStore.setState({ testStatus: "failure" });
		expect(useAIStore.getState().canEnable()).toBe(false);
	});

	it("setEnabled(true) refuses to enable when testStatus is not success", () => {
		useAIStore.getState().setEnabled(true);
		expect(useAIStore.getState().enabled).toBe(false);
	});

	it("setEnabled(true) succeeds when testStatus is success", () => {
		useAIStore.setState({ testStatus: "success" });
		useAIStore.getState().setEnabled(true);
		expect(useAIStore.getState().enabled).toBe(true);
	});

	it("setEnabled(false) always succeeds (regardless of testStatus)", () => {
		useAIStore.setState({ testStatus: "success", enabled: true });
		useAIStore.getState().setEnabled(false);
		expect(useAIStore.getState().enabled).toBe(false);
	});

	it("reset() clears every field back to initial state", () => {
		useAIStore.setState({
			enabled: true,
			provider: "anthropic",
			model: "claude-3",
			apiKey: "key",
			baseURL: "https://api.anthropic.com",
			testStatus: "success",
		});

		useAIStore.getState().reset();

		const state = useAIStore.getState();
		expect(state).toMatchObject({
			enabled: false,
			provider: "openai",
			model: "",
			apiKey: "",
			baseURL: "",
			testStatus: "unverified",
		});
	});

	it("resets when only the provider changes", () => {
		useAIStore.setState({ testStatus: "success", enabled: true });

		useAIStore.getState().set((draft) => {
			draft.provider = "gemini";
		});

		expect(useAIStore.getState().testStatus).toBe("unverified");
		expect(useAIStore.getState().enabled).toBe(false);
	});

	it("resets when only the baseURL changes", () => {
		useAIStore.setState({ testStatus: "success", enabled: true });

		useAIStore.getState().set((draft) => {
			draft.baseURL = "https://custom.example";
		});

		expect(useAIStore.getState().testStatus).toBe("unverified");
		expect(useAIStore.getState().enabled).toBe(false);
	});
});
