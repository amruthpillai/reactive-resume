// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Command } from "@reactive-resume/ui/components/command";
import { useCommandPaletteStore } from "../store";
import { BaseCommandGroup } from "./base";

const renderInCommand = (ui: React.ReactNode) => render(<Command>{ui}</Command>);

const resetStore = () => {
	useCommandPaletteStore.setState({ open: false, search: "", pages: [] });
};

afterEach(resetStore);

describe("BaseCommandGroup", () => {
	it("renders children at the root (no page prop) when the page stack is empty", () => {
		renderInCommand(<BaseCommandGroup heading="Root">child-text</BaseCommandGroup>);
		expect(screen.getByText("child-text")).toBeInTheDocument();
	});

	it("does NOT render when the page stack tops a different page than its `page` prop", () => {
		useCommandPaletteStore.setState({ pages: ["other"] });
		const { container } = renderInCommand(
			<BaseCommandGroup page="settings" heading="Settings">
				<span>x</span>
			</BaseCommandGroup>,
		);
		// Nothing rendered besides the Command shell itself.
		expect(container.textContent).toBe("");
	});

	it("renders when the top of the page stack matches its `page` prop", () => {
		useCommandPaletteStore.setState({ pages: ["settings"] });
		renderInCommand(
			<BaseCommandGroup page="settings" heading="Settings">
				settings-children
			</BaseCommandGroup>,
		);
		expect(screen.getByText("settings-children")).toBeInTheDocument();
	});

	it("does NOT render the root group when there is a sub-page on top", () => {
		useCommandPaletteStore.setState({ pages: ["settings"] });
		const { container } = renderInCommand(
			<BaseCommandGroup heading="Root">
				<span>root-text</span>
			</BaseCommandGroup>,
		);
		expect(container.textContent).toBe("");
	});
});
