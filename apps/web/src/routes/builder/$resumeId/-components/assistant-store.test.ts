import { afterEach, describe, expect, it } from "vitest";
import { useBuilderAssistantStore } from "./assistant-store";

afterEach(() => useBuilderAssistantStore.setState({ isOpen: false }));

describe("useBuilderAssistantStore", () => {
	it("starts closed", () => {
		expect(useBuilderAssistantStore.getState().isOpen).toBe(false);
	});

	it("setOpen overrides the open state directly", () => {
		useBuilderAssistantStore.getState().setOpen(true);
		expect(useBuilderAssistantStore.getState().isOpen).toBe(true);

		useBuilderAssistantStore.getState().setOpen(false);
		expect(useBuilderAssistantStore.getState().isOpen).toBe(false);
	});

	it("toggleOpen flips the state", () => {
		const { toggleOpen } = useBuilderAssistantStore.getState();

		toggleOpen();
		expect(useBuilderAssistantStore.getState().isOpen).toBe(true);

		toggleOpen();
		expect(useBuilderAssistantStore.getState().isOpen).toBe(false);
	});
});
