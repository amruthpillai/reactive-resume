import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PromptDialogProvider, usePrompt } from "./use-prompt";

type PromptRunnerProps = {
	onResult: (v: string | null) => void;
	title: string;
	options?: Parameters<ReturnType<typeof usePrompt>>[1];
};

const PromptRunner = ({ onResult, title, options }: PromptRunnerProps) => {
	const prompt = usePrompt();
	return (
		<button
			type="button"
			onClick={async () => {
				const result = await prompt(title, options);
				onResult(result);
			}}
		>
			Trigger
		</button>
	);
};

describe("usePrompt", () => {
	it("throws when used outside PromptDialogProvider", () => {
		expect(() =>
			render(
				<PromptRunner
					title="x"
					onResult={() => {
						/* noop */
					}}
				/>,
			),
		).toThrow(/usePrompt must be used within/);
	});

	it("renders children inside provider", () => {
		render(
			<PromptDialogProvider>
				<div data-testid="child">child</div>
			</PromptDialogProvider>,
		);
		expect(screen.getByTestId("child")).toBeInTheDocument();
	});

	it("opens an alert dialog when prompt is called", async () => {
		render(
			<PromptDialogProvider>
				<PromptRunner
					title="Enter name"
					onResult={() => {
						/* noop */
					}}
				/>
			</PromptDialogProvider>,
		);

		await userEvent.click(screen.getByText("Trigger"));
		expect(await screen.findByText("Enter name")).toBeInTheDocument();
	});

	it("resolves with input value when confirm clicked", async () => {
		const results: (string | null)[] = [];
		render(
			<PromptDialogProvider>
				<PromptRunner title="Name?" onResult={(v) => results.push(v)} />
			</PromptDialogProvider>,
		);

		await userEvent.click(screen.getByText("Trigger"));
		await screen.findByText("Name?");

		const input = screen.getByRole("textbox");
		await userEvent.type(input, "Alice");
		await userEvent.click(screen.getByText("Confirm"));

		await act(async () => {
			await new Promise((r) => setTimeout(r, 0));
		});
		expect(results).toEqual(["Alice"]);
	});

	it("resolves null when cancel is clicked", async () => {
		const results: (string | null)[] = [];
		render(
			<PromptDialogProvider>
				<PromptRunner title="x" onResult={(v) => results.push(v)} />
			</PromptDialogProvider>,
		);

		await userEvent.click(screen.getByText("Trigger"));
		await screen.findByText("x");
		await userEvent.click(screen.getByText("Cancel"));

		await act(async () => {
			await new Promise((r) => setTimeout(r, 0));
		});
		expect(results).toEqual([null]);
	});

	it("uses defaultValue as initial input value", async () => {
		render(
			<PromptDialogProvider>
				<PromptRunner
					title="x"
					options={{ defaultValue: "default-name" }}
					onResult={() => {
						/* noop */
					}}
				/>
			</PromptDialogProvider>,
		);

		await userEvent.click(screen.getByText("Trigger"));
		const input = await screen.findByRole("textbox");
		expect(input).toHaveValue("default-name");
	});

	it("submits on Enter key", async () => {
		const results: (string | null)[] = [];
		render(
			<PromptDialogProvider>
				<PromptRunner title="x" onResult={(v) => results.push(v)} />
			</PromptDialogProvider>,
		);

		await userEvent.click(screen.getByText("Trigger"));
		const input = await screen.findByRole("textbox");
		await userEvent.type(input, "via-enter{Enter}");

		await act(async () => {
			await new Promise((r) => setTimeout(r, 0));
		});
		expect(results).toEqual(["via-enter"]);
	});

	it("renders custom confirmText and cancelText", async () => {
		render(
			<PromptDialogProvider>
				<PromptRunner
					title="x"
					options={{ confirmText: "Save", cancelText: "Discard" }}
					onResult={() => {
						/* noop */
					}}
				/>
			</PromptDialogProvider>,
		);

		await userEvent.click(screen.getByText("Trigger"));
		expect(await screen.findByText("Save")).toBeInTheDocument();
		expect(screen.getByText("Discard")).toBeInTheDocument();
	});

	it("renders description when provided", async () => {
		render(
			<PromptDialogProvider>
				<PromptRunner
					title="x"
					options={{ description: "Explain why" }}
					onResult={() => {
						/* noop */
					}}
				/>
			</PromptDialogProvider>,
		);

		await userEvent.click(screen.getByText("Trigger"));
		expect(await screen.findByText("Explain why")).toBeInTheDocument();
	});
});
