// @vitest-environment happy-dom

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Dialog } from "@reactive-resume/ui/components/dialog";
import { useDialogStore } from "@/dialogs/store";
import { ConfirmDialogProvider } from "@/hooks/use-confirm";

const navigate = vi.hoisted(() => vi.fn());
// Stands in for the navigation TanStack Router performs from inside <Link>. Keeping it separate
// from `navigate` lets a test tell "the router took us away" apart from "the dialog took us away".
const routerNavigate = vi.hoisted(() => vi.fn());

type MockLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
	to: string;
	children: ReactNode;
};

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigate,
	// Mirrors the part of <Link> this fix depends on: the router handles the click and navigates
	// unless something already prevented the default. Without that, a missing preventDefault() in
	// the dialog would go unnoticed here.
	Link: ({ to, children, onClick, ...props }: MockLinkProps) => (
		<a
			href={to}
			onClick={(event) => {
				onClick?.(event);

				if (event.defaultPrevented) return;
				if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

				routerNavigate({ to });
			}}
			{...props}
		>
			{children}
		</a>
	),
}));

vi.mock("@/features/settings/integrations/hooks/use-has-usable-ai-provider", () => ({
	useHasUsableAiProvider: () => ({ hasUsableProvider: false, isLoading: false }),
}));

vi.mock("@/libs/orpc/client", () => ({
	client: {},
	orpc: { resume: { import: { mutationOptions: () => ({ mutationFn: vi.fn() }) } } },
}));

const { ImportResumeDialog } = await import("./import");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

afterEach(() => {
	navigate.mockReset();
	routerNavigate.mockReset();
});

// Drive `open` from the store the way DialogManager does, so closing the dialog actually unmounts it.
function DialogHarness() {
	const open = useDialogStore((state) => state.open);

	return (
		<Dialog open={open}>
			<ImportResumeDialog />
		</Dialog>
	);
}

const renderDialog = () => {
	useDialogStore.setState({ open: true, activeDialog: null, onBeforeClose: null });

	return render(
		<I18nProvider i18n={i18n}>
			<QueryClientProvider client={new QueryClient()}>
				<ConfirmDialogProvider>
					<DialogHarness />
				</ConfirmDialogProvider>
			</QueryClientProvider>
		</I18nProvider>,
	);
};

// Word still needs a provider, so it is what surfaces the notice. PDF falls back to a local parse.
const createWordFile = () =>
	new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], "resume.docx", {
		type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	});

// The dialog renders through a portal, so query the document rather than the render container.
async function selectWordFile() {
	const input = document.querySelector<HTMLInputElement>('input[type="file"]');
	if (!input) throw new Error("File input not found");

	fireEvent.change(input, { target: { files: [createWordFile()] } });

	return await screen.findByText("Set up a provider");
}

const createPdfFile = () =>
	new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "resume.pdf", { type: "application/pdf" });

describe("ImportResumeDialog — PDF without a provider", () => {
	it("offers a local parse instead of demanding an AI provider", async () => {
		renderDialog();
		const input = document.querySelector<HTMLInputElement>('input[type="file"]');
		if (!input) throw new Error("File input not found");

		fireEvent.change(input, { target: { files: [createPdfFile()] } });

		expect(await screen.findByText(/read the text out of the PDF here in your browser/)).toBeInTheDocument();
		expect(screen.queryByText("Set up a provider")).not.toBeInTheDocument();
	});

	it("keeps the import button usable", async () => {
		renderDialog();
		const input = document.querySelector<HTMLInputElement>('input[type="file"]');
		if (!input) throw new Error("File input not found");

		fireEvent.change(input, { target: { files: [createPdfFile()] } });
		await screen.findByText(/read the text out of the PDF here in your browser/);

		expect(screen.getByRole("button", { name: "Import" })).not.toBeDisabled();
	});
});

describe("ImportResumeDialog — Set up a provider", () => {
	// https://github.com/amruthpillai/reactive-resume/issues/3307
	it("confirms before leaving instead of navigating behind the dialog", async () => {
		renderDialog();
		const link = await selectWordFile();

		fireEvent.click(link);

		expect(await screen.findByText("Leave to set up an AI provider?")).toBeInTheDocument();
		expect(routerNavigate).not.toHaveBeenCalled();
		expect(navigate).not.toHaveBeenCalled();
		expect(screen.getByText("Import an existing resume")).toBeInTheDocument();
	});

	it("stays put and keeps the selected file when the user cancels", async () => {
		renderDialog();
		const link = await selectWordFile();

		fireEvent.click(link);
		fireEvent.click(await screen.findByText("Stay"));

		await waitFor(() => {
			expect(screen.queryByText("Leave to set up an AI provider?")).not.toBeInTheDocument();
		});

		expect(routerNavigate).not.toHaveBeenCalled();
		expect(navigate).not.toHaveBeenCalled();
		expect(useDialogStore.getState().open).toBe(true);
		expect(screen.getByText("resume.docx")).toBeInTheDocument();
	});

	it("closes the dialog and navigates once the user confirms", async () => {
		renderDialog();
		const link = await selectWordFile();

		fireEvent.click(link);
		fireEvent.click(await screen.findByText("Leave"));

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith({ to: "/dashboard/settings/integrations" });
		});

		expect(useDialogStore.getState().open).toBe(false);
		await waitFor(() => {
			expect(screen.queryByText("Set up a provider")).not.toBeInTheDocument();
		});
	});

	it("leaves modifier clicks to the browser so the link can open in a new tab", async () => {
		renderDialog();
		const link = await selectWordFile();

		const event = new MouseEvent("click", { bubbles: true, cancelable: true, metaKey: true });
		fireEvent(link, event);

		expect(event.defaultPrevented).toBe(false);
		expect(screen.queryByText("Leave to set up an AI provider?")).not.toBeInTheDocument();
		expect(navigate).not.toHaveBeenCalled();
	});

	it("leaves middle clicks to the browser too", async () => {
		renderDialog();
		const link = await selectWordFile();

		const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 1 });
		fireEvent(link, event);

		expect(event.defaultPrevented).toBe(false);
		expect(screen.queryByText("Leave to set up an AI provider?")).not.toBeInTheDocument();
		expect(navigate).not.toHaveBeenCalled();
	});
});
