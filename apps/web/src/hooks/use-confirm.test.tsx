// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfirmDialogProvider, useConfirm } from "./use-confirm";

const wrapper = ({ children }: { children: React.ReactNode }) => (
	<ConfirmDialogProvider>{children}</ConfirmDialogProvider>
);

describe("useConfirm", () => {
	it("throws when used outside ConfirmDialogProvider", () => {
		expect(() => renderHook(() => useConfirm())).toThrow(/useConfirm must be used within a <ConfirmDialogProvider \/>/);
	});

	it("returns a confirm function when wrapped in provider", () => {
		const { result } = renderHook(() => useConfirm(), { wrapper });
		expect(typeof result.current).toBe("function");
	});

	it("returns a pending promise that resolves to a boolean", async () => {
		const { result } = renderHook(() => useConfirm(), { wrapper });

		let promise!: Promise<boolean>;
		await act(async () => {
			promise = result.current("Are you sure?");
		});
		expect(promise).toBeInstanceOf(Promise);
	});

	it("resolves false when the dialog is dismissed", async () => {
		const { result } = renderHook(() => useConfirm(), { wrapper });

		let promise!: Promise<boolean>;
		await act(async () => {
			promise = result.current("Heading");
		});

		// Click the cancel button to close.
		const cancelBtn = document.body.querySelector('button[type="button"][data-slot="alert-dialog-cancel"]');
		// Fallback: cancel buttons in shadcn/base-ui dialogs usually carry role="button" + text.
		const buttons = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button"));
		const cancel = buttons.find((b) => /cancel/i.test(b.textContent ?? ""));

		await act(async () => {
			(cancelBtn as HTMLButtonElement | null)?.click() ?? cancel?.click();
		});

		await expect(promise).resolves.toBe(false);
	});

	it("resolves true when the confirm button is clicked", async () => {
		const { result } = renderHook(() => useConfirm(), { wrapper });

		let promise!: Promise<boolean>;
		await act(async () => {
			promise = result.current("Heading", { confirmText: "Yes" });
		});

		const buttons = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button"));
		const yes = buttons.find((b) => /yes/i.test(b.textContent ?? ""));

		await act(async () => {
			yes?.click();
		});

		await expect(promise).resolves.toBe(true);
	});
});
