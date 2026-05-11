import { afterEach, describe, expect, it } from "vitest";
import {
	DEFAULT_BUILDER_LAYOUT,
	mapPanelLayoutToBuilderLayout,
	parseBuilderLayoutCookie,
	useBuilderSidebarStore,
} from "./sidebar";

afterEach(() => {
	useBuilderSidebarStore.setState({
		layout: DEFAULT_BUILDER_LAYOUT,
		leftSidebar: null,
		rightSidebar: null,
	});
});

describe("parseBuilderLayoutCookie", () => {
	it("returns the default layout when value is undefined", () => {
		expect(parseBuilderLayoutCookie(undefined)).toEqual(DEFAULT_BUILDER_LAYOUT);
	});

	it("returns the default layout when value is null", () => {
		expect(parseBuilderLayoutCookie(null)).toEqual(DEFAULT_BUILDER_LAYOUT);
	});

	it("returns the default layout when value is an empty string", () => {
		expect(parseBuilderLayoutCookie("")).toEqual(DEFAULT_BUILDER_LAYOUT);
	});

	it("returns the default layout when value is malformed JSON", () => {
		expect(parseBuilderLayoutCookie("{not-json")).toEqual(DEFAULT_BUILDER_LAYOUT);
	});

	it("returns the default layout when value is a JSON array", () => {
		expect(parseBuilderLayoutCookie("[1,2,3]")).toEqual(DEFAULT_BUILDER_LAYOUT);
	});

	it("returns the default layout when value is a JSON primitive", () => {
		expect(parseBuilderLayoutCookie("42")).toEqual(DEFAULT_BUILDER_LAYOUT);
		expect(parseBuilderLayoutCookie("null")).toEqual(DEFAULT_BUILDER_LAYOUT);
		expect(parseBuilderLayoutCookie('"string"')).toEqual(DEFAULT_BUILDER_LAYOUT);
	});

	it("returns the default layout when any field is missing or not a number", () => {
		expect(parseBuilderLayoutCookie('{"left":10,"artboard":50}')).toEqual(DEFAULT_BUILDER_LAYOUT);
		expect(parseBuilderLayoutCookie('{"left":"10","artboard":50,"right":40}')).toEqual(DEFAULT_BUILDER_LAYOUT);
	});

	it("returns the parsed layout when all fields are numeric", () => {
		const json = JSON.stringify({ left: 10, artboard: 60, right: 30 });
		expect(parseBuilderLayoutCookie(json)).toEqual({ left: 10, artboard: 60, right: 30 });
	});
});

describe("mapPanelLayoutToBuilderLayout", () => {
	it("returns the default layout if any panel size is missing", () => {
		expect(mapPanelLayoutToBuilderLayout({} as never)).toEqual(DEFAULT_BUILDER_LAYOUT);
		expect(mapPanelLayoutToBuilderLayout({ left: 10, artboard: 60 } as never)).toEqual(DEFAULT_BUILDER_LAYOUT);
	});

	it("returns the layout when all panel sizes are numeric", () => {
		const layout = mapPanelLayoutToBuilderLayout({ left: 15, artboard: 70, right: 15 } as never);
		expect(layout).toEqual({ left: 15, artboard: 70, right: 15 });
	});
});

describe("useBuilderSidebarStore", () => {
	it("starts with default layout and null panel refs", () => {
		const state = useBuilderSidebarStore.getState();
		expect(state.layout).toEqual(DEFAULT_BUILDER_LAYOUT);
		expect(state.leftSidebar).toBeNull();
		expect(state.rightSidebar).toBeNull();
	});

	it("setLayout replaces the layout", () => {
		useBuilderSidebarStore.getState().setLayout({ left: 1, artboard: 98, right: 1 });
		expect(useBuilderSidebarStore.getState().layout).toEqual({ left: 1, artboard: 98, right: 1 });
	});

	it("setLeftSidebar and setRightSidebar store refs", () => {
		const left = { foo: "left" } as never;
		const right = { foo: "right" } as never;

		useBuilderSidebarStore.getState().setLeftSidebar(left);
		useBuilderSidebarStore.getState().setRightSidebar(right);

		expect(useBuilderSidebarStore.getState().leftSidebar).toBe(left);
		expect(useBuilderSidebarStore.getState().rightSidebar).toBe(right);
	});

	it("accepts null to clear sidebar refs", () => {
		useBuilderSidebarStore.getState().setLeftSidebar({ foo: "x" } as never);
		useBuilderSidebarStore.getState().setLeftSidebar(null);
		expect(useBuilderSidebarStore.getState().leftSidebar).toBeNull();
	});
});
