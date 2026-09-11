// @vitest-environment happy-dom

import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { DonationToast } from "./donation-toast";

type AddOptions = {
	actionProps: { children: string; onClick: () => void };
	description: string;
	id: string;
	onClose: () => void;
	timeout: number;
	title: string;
};

const cookieMock = vi.hoisted(() => ({
	value: null as string | null,
	set: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
	toast: {
		add: vi.fn(),
		close: vi.fn(),
	},
}));

vi.mock("js-cookie", () => ({
	default: {
		get: vi.fn(() => cookieMock.value ?? undefined),
		set: cookieMock.set,
	},
}));

vi.mock("@reactive-resume/ui/components/toast", () => ({
	toast: toastMock.toast,
}));

const getAddOptions = () => {
	const call = toastMock.toast.add.mock.calls[0] as [AddOptions] | undefined;
	if (!call) throw new Error("Donation toast was not shown.");
	return call[0];
};

const SHOW_TOAST_DELAY_MS = 5 * 60 * 1000;

describe("DonationToast", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-05-11T12:00:00.000Z"));
		i18n.loadAndActivate({ locale: "en-US", messages: {} });
		cookieMock.value = null;
		cookieMock.set.mockClear();
		toastMock.toast.add.mockClear();
		toastMock.toast.close.mockClear();
		vi.spyOn(window, "open").mockReturnValue(null);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it("waits before showing the donation toast", () => {
		render(<DonationToast />);

		expect(toastMock.toast.add).not.toHaveBeenCalled();

		act(() => {
			vi.advanceTimersByTime(SHOW_TOAST_DELAY_MS - 1);
		});
		expect(toastMock.toast.add).not.toHaveBeenCalled();

		act(() => {
			vi.advanceTimersByTime(1);
		});

		expect(toastMock.toast.add).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "donation-toast",
				timeout: 0,
				title: "Please support the project",
			}),
		);
	});

	it("does not show the toast after it has been dismissed", () => {
		cookieMock.value = "true";

		render(<DonationToast />);

		act(() => {
			vi.advanceTimersByTime(SHOW_TOAST_DELAY_MS);
		});

		expect(toastMock.toast.add).not.toHaveBeenCalled();
	});

	it("sets a 30-day dismissed cookie when closed", () => {
		render(<DonationToast />);

		act(() => {
			vi.advanceTimersByTime(SHOW_TOAST_DELAY_MS);
		});

		act(() => {
			getAddOptions().onClose();
		});

		expect(cookieMock.set).toHaveBeenCalledWith("donation-toast-dismissed", "true", {
			path: "/",
			secure: true,
			sameSite: "lax",
			expires: new Date("2026-06-10T12:05:00.000Z"),
		});
	});

	it("opens Open Collective and closes the toast when donating", () => {
		render(<DonationToast />);

		act(() => {
			vi.advanceTimersByTime(SHOW_TOAST_DELAY_MS);
		});

		const options = getAddOptions();
		expect(options.actionProps.children).toBe("Donate");

		act(() => {
			options.actionProps.onClick();
		});

		expect(window.open).toHaveBeenCalledWith(
			"https://opencollective.com/reactive-resume/donate",
			"_blank",
			"noopener,noreferrer",
		);
		expect(toastMock.toast.close).toHaveBeenCalledWith("donation-toast");
	});
});
