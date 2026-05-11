// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { i18n } from "@lingui/core";
import { PromptDialogProvider, usePrompt } from "./use-prompt";

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
	<PromptDialogProvider>{children}</PromptDialogProvider>
);

const clickButton = (re: RegExp) => {
	const buttons = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button"));
	buttons.find((b) => re.test(b.textContent ?? ""))?.click();
};

describe("usePrompt", () => {
	it("throws when used outside PromptDialogProvider", () => {
		expect(() => renderHook(() => usePrompt())).toThrow(/usePrompt must be used within a <PromptDialogProvider \/>/);
	});

	it("returns a function when wrapped in provider", () => {
		const { result } = renderHook(() => usePrompt(), { wrapper });
		expect(typeof result.current).toBe("function");
	});

	it("resolves null when Cancel is clicked", async () => {
		const { result } = renderHook(() => usePrompt(), { wrapper });

		let promise!: Promise<string | null>;
		await act(async () => {
			promise = result.current("Name?");
		});

		await act(async () => {
			clickButton(/cancel/i);
		});

		await expect(promise).resolves.toBeNull();
	});

	it("resolves to current input value when Confirm is clicked", async () => {
		const { result } = renderHook(() => usePrompt(), { wrapper });

		let promise!: Promise<string | null>;
		await act(async () => {
			promise = result.current("Name?", { defaultValue: "Initial" });
		});

		await act(async () => {
			clickButton(/confirm/i);
		});

		await expect(promise).resolves.toBe("Initial");
	});

	it("uses the supplied defaultValue as the initial input value", async () => {
		const { result } = renderHook(() => usePrompt(), { wrapper });

		let promise!: Promise<string | null>;
		await act(async () => {
			promise = result.current("Heading", { defaultValue: "preset" });
		});

		// The input element should hold the default before we click anything.
		const input = document.body.querySelector("input") as HTMLInputElement | null;
		expect(input?.value).toBe("preset");

		await act(async () => {
			clickButton(/confirm/i);
		});

		await expect(promise).resolves.toBe("preset");
	});
});
