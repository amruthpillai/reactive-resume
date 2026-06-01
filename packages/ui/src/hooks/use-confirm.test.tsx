import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ConfirmDialogProvider, useConfirm } from "./use-confirm";

type ConfirmRunnerProps = {
	onResult: (v: boolean) => void;
	title: string;
	options?: Parameters<ReturnType<typeof useConfirm>>[1];
};

const ConfirmRunner = ({ onResult, title, options }: ConfirmRunnerProps) => {
	const confirm = useConfirm();
	return (
		<button
			type="button"
			onClick={async () => {
				const result = await confirm(title, options);
				onResult(result);
			}}
		>
			Trigger
		</button>
	);
};

describe("useConfirm", () => {
	it("throws when used outside ConfirmDialogProvider", () => {
		// React 19 logs the error rather than throwing — we use renderHook+ErrorBoundary alt:
		// Use the hook in a component and check that React surfaces the throw.
		expect(() =>
			render(
				<ConfirmRunner
					title="x"
					onResult={() => {
						/* noop */
					}}
				/>,
			),
		).toThrow(/useConfirm must be used within/);
	});

	it("renders children inside provider", () => {
		render(
			<ConfirmDialogProvider>
				<div data-testid="child">child</div>
			</ConfirmDialogProvider>,
		);
		expect(screen.getByTestId("child")).toBeInTheDocument();
	});

	it("opens an alert dialog when confirm is called", async () => {
		const results: boolean[] = [];
		render(
			<ConfirmDialogProvider>
				<ConfirmRunner title="Delete it?" onResult={(v) => results.push(v)} />
			</ConfirmDialogProvider>,
		);

		await userEvent.click(screen.getByText("Trigger"));
		expect(await screen.findByText("Delete it?")).toBeInTheDocument();
	});

	it("resolves true when confirm is clicked", async () => {
		const results: boolean[] = [];
		render(
			<ConfirmDialogProvider>
				<ConfirmRunner title="Sure?" onResult={(v) => results.push(v)} />
			</ConfirmDialogProvider>,
		);

		await userEvent.click(screen.getByText("Trigger"));
		await screen.findByText("Sure?");
		await userEvent.click(screen.getByText("Confirm"));

		// Wait for promise to resolve
		await act(async () => {
			await new Promise((r) => setTimeout(r, 0));
		});
		expect(results).toEqual([true]);
	});

	it("resolves false when cancel is clicked", async () => {
		const results: boolean[] = [];
		render(
			<ConfirmDialogProvider>
				<ConfirmRunner title="Cancel?" onResult={(v) => results.push(v)} />
			</ConfirmDialogProvider>,
		);

		await userEvent.click(screen.getByText("Trigger"));
		await screen.findByText("Cancel?");
		await userEvent.click(screen.getByText("Cancel"));

		await act(async () => {
			await new Promise((r) => setTimeout(r, 0));
		});
		expect(results).toEqual([false]);
	});

	it("renders custom confirmText and cancelText", async () => {
		render(
			<ConfirmDialogProvider>
				<ConfirmRunner
					title="x"
					options={{ confirmText: "Yes!", cancelText: "Nope" }}
					onResult={() => {
						/* noop */
					}}
				/>
			</ConfirmDialogProvider>,
		);

		await userEvent.click(screen.getByText("Trigger"));
		expect(await screen.findByText("Yes!")).toBeInTheDocument();
		expect(screen.getByText("Nope")).toBeInTheDocument();
	});

	it("renders description when provided", async () => {
		render(
			<ConfirmDialogProvider>
				<ConfirmRunner
					title="x"
					options={{ description: "This will permanently delete the record." }}
					onResult={() => {
						/* noop */
					}}
				/>
			</ConfirmDialogProvider>,
		);

		await userEvent.click(screen.getByText("Trigger"));
		expect(await screen.findByText("This will permanently delete the record.")).toBeInTheDocument();
	});

	it("falls back to 'Confirm' / 'Cancel' default labels", async () => {
		render(
			<ConfirmDialogProvider>
				<ConfirmRunner
					title="x"
					onResult={() => {
						/* noop */
					}}
				/>
			</ConfirmDialogProvider>,
		);

		await userEvent.click(screen.getByText("Trigger"));
		expect(await screen.findByText("Confirm")).toBeInTheDocument();
		expect(screen.getByText("Cancel")).toBeInTheDocument();
	});
});
