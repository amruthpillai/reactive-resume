// @vitest-environment happy-dom

import type React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { DonationToast } from "./donation-toast";

type ToastOptions = {
	dismissible: boolean;
	duration: number;
	id: string;
	unstyled: boolean;
};

const useCookieMock = vi.hoisted(() => ({
	setDismissed: vi.fn(),
	value: null as string | null,
}));

const toastMock = vi.hoisted(() => ({
	toast: {
		custom: vi.fn(),
		dismiss: vi.fn(),
	},
}));

vi.mock("@reactive-resume/ui/hooks/use-cookie", () => ({
	useCookie: vi.fn(() => [useCookieMock.value, useCookieMock.setDismissed, vi.fn()] as const),
}));

vi.mock("sonner", () => ({
	toast: toastMock.toast,
}));

const getCustomToast = () =>
	toastMock.toast.custom.mock.calls[0] as [(toastId: string | number) => React.ReactElement, ToastOptions] | undefined;

const SHOW_TOAST_DELAY_MS = 5 * 60 * 1000;

const renderCustomToast = () => {
	const customToast = getCustomToast();
	if (!customToast) throw new Error("Custom toast was not rendered.");

	return render(<I18nProvider i18n={i18n}>{customToast[0]("donation-toast")}</I18nProvider>);
};

describe("DonationToast", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-05-11T12:00:00.000Z"));
		i18n.loadAndActivate({ locale: "en-US", messages: {} });
		useCookieMock.value = null;
		useCookieMock.setDismissed.mockClear();
		toastMock.toast.custom.mockClear();
		toastMock.toast.dismiss.mockClear();
		vi.spyOn(window, "open").mockReturnValue(null);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it("waits before showing the donation toast", () => {
		render(<DonationToast />);

		expect(toastMock.toast.custom).not.toHaveBeenCalled();

		act(() => {
			vi.advanceTimersByTime(SHOW_TOAST_DELAY_MS - 1);
		});
		expect(toastMock.toast.custom).not.toHaveBeenCalled();

		act(() => {
			vi.advanceTimersByTime(1);
		});

		expect(toastMock.toast.custom).toHaveBeenCalledWith(
			expect.any(Function),
			expect.objectContaining({
				dismissible: false,
				duration: Number.POSITIVE_INFINITY,
				id: "donation-toast",
				unstyled: true,
			}),
		);
	});

	it("does not show the toast after it has been dismissed", () => {
		useCookieMock.value = "true";

		render(<DonationToast />);

		act(() => {
			vi.advanceTimersByTime(SHOW_TOAST_DELAY_MS);
		});

		expect(toastMock.toast.custom).not.toHaveBeenCalled();
	});

	it("sets a 30-day dismissed cookie when dismissed", () => {
		render(<DonationToast />);

		act(() => {
			vi.advanceTimersByTime(SHOW_TOAST_DELAY_MS);
		});
		renderCustomToast();

		fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

		expect(useCookieMock.setDismissed).toHaveBeenCalledWith("true", {
			expires: new Date("2026-06-10T12:05:00.000Z"),
		});
		expect(toastMock.toast.dismiss).toHaveBeenCalledWith("donation-toast");
	});

	it("sets a 30-day dismissed cookie and opens Open Collective when donated", () => {
		render(<DonationToast />);

		act(() => {
			vi.advanceTimersByTime(SHOW_TOAST_DELAY_MS);
		});
		renderCustomToast();

		fireEvent.click(screen.getByRole("button", { name: "Donate" }));

		expect(useCookieMock.setDismissed).toHaveBeenCalledWith("true", {
			expires: new Date("2026-06-10T12:05:00.000Z"),
		});
		expect(window.open).toHaveBeenCalledWith(
			"https://opencollective.com/reactive-resume/donate",
			"_blank",
			"noopener,noreferrer",
		);
		expect(toastMock.toast.dismiss).toHaveBeenCalledWith("donation-toast");
	});
});
