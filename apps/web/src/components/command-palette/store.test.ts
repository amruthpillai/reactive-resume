import { afterEach, describe, expect, it } from "vitest";
import { useCommandPaletteStore } from "./store";

const reset = () => {
	useCommandPaletteStore.setState({ open: false, search: "", pages: [] });
};

afterEach(reset);

describe("useCommandPaletteStore", () => {
	it("starts closed with empty search and no pages", () => {
		const state = useCommandPaletteStore.getState();
		expect(state.open).toBe(false);
		expect(state.search).toBe("");
		expect(state.pages).toEqual([]);
	});

	it("setOpen(true) opens the palette without touching other fields", () => {
		useCommandPaletteStore.setState({ search: "foo", pages: ["page1"] });

		useCommandPaletteStore.getState().setOpen(true);

		const state = useCommandPaletteStore.getState();
		expect(state.open).toBe(true);
		expect(state.search).toBe("foo");
		expect(state.pages).toEqual(["page1"]);
	});

	it("setOpen(false) resets the entire store back to initial state", () => {
		useCommandPaletteStore.setState({ open: true, search: "foo", pages: ["page1"] });

		useCommandPaletteStore.getState().setOpen(false);

		const state = useCommandPaletteStore.getState();
		expect(state.open).toBe(false);
		expect(state.search).toBe("");
		expect(state.pages).toEqual([]);
	});

	it("setSearch updates only the search field", () => {
		useCommandPaletteStore.getState().setSearch("query");
		expect(useCommandPaletteStore.getState().search).toBe("query");
	});

	it("pushPage appends a page and clears search", () => {
		useCommandPaletteStore.setState({ search: "leftover" });

		useCommandPaletteStore.getState().pushPage("settings");

		const state = useCommandPaletteStore.getState();
		expect(state.pages).toEqual(["settings"]);
		expect(state.search).toBe("");
	});

	it("pushPage stacks multiple pages in order", () => {
		const { pushPage } = useCommandPaletteStore.getState();
		pushPage("a");
		pushPage("b");
		pushPage("c");
		expect(useCommandPaletteStore.getState().pages).toEqual(["a", "b", "c"]);
	});

	it("peekPage returns the top page (or undefined when empty)", () => {
		expect(useCommandPaletteStore.getState().peekPage()).toBeUndefined();

		useCommandPaletteStore.setState({ pages: ["a", "b"] });
		expect(useCommandPaletteStore.getState().peekPage()).toBe("b");
	});

	it("popPage removes the last page and clears search", () => {
		useCommandPaletteStore.setState({ pages: ["a", "b"], search: "x" });

		useCommandPaletteStore.getState().popPage();

		const state = useCommandPaletteStore.getState();
		expect(state.pages).toEqual(["a"]);
		expect(state.search).toBe("");
	});

	it("reset clears every state field", () => {
		useCommandPaletteStore.setState({ open: true, search: "x", pages: ["a"] });

		useCommandPaletteStore.getState().reset();

		expect(useCommandPaletteStore.getState()).toMatchObject({ open: false, search: "", pages: [] });
	});

	describe("goBack", () => {
		it("clears search first if present, leaving pages and open untouched", () => {
			useCommandPaletteStore.setState({ open: true, search: "text", pages: ["a"] });

			useCommandPaletteStore.getState().goBack();

			const state = useCommandPaletteStore.getState();
			expect(state.search).toBe("");
			expect(state.pages).toEqual(["a"]);
			expect(state.open).toBe(true);
		});

		it("pops the top page when no search and pages exist", () => {
			useCommandPaletteStore.setState({ open: true, search: "", pages: ["a", "b"] });

			useCommandPaletteStore.getState().goBack();

			const state = useCommandPaletteStore.getState();
			expect(state.pages).toEqual(["a"]);
			expect(state.open).toBe(true);
		});

		it("closes the palette when no search and no pages", () => {
			useCommandPaletteStore.setState({ open: true, search: "", pages: [] });

			useCommandPaletteStore.getState().goBack();

			expect(useCommandPaletteStore.getState().open).toBe(false);
		});
	});
});
