// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Dialog } from "@reactive-resume/ui/components/dialog";
import { useDialogStore } from "@/dialogs/store";
import { ConfirmDialogProvider } from "@/hooks/use-confirm";

const navigate = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigate,
	Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
		<a href={to} {...props}>
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
	useDialogStore.setState({ open: true, activeDialog: null, onBeforeClose: null });
});

const renderDialog = () => {
	useDialogStore.setState({ open: true, activeDialog: null, onBeforeClose: null });

	return render(
		<I18nProvider i18n={i18n}>
			<QueryClientProvider client={new QueryClient()}>
				<ConfirmDialogProvider>
					<Dialog open>
						<ImportResumeDialog />
					</Dialog>
				</ConfirmDialogProvider>
			</QueryClientProvider>
		</I18nProvider>,
	);
};

// A real "%PDF" header so the dialog auto-detects the type and shows the provider notice.
const createPdfFile = () =>
	new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "resume.pdf", { type: "application/pdf" });

// The dialog renders through a portal, so query the document rather than the render container.
async function selectPdfFile() {
	const input = document.querySelector<HTMLInputElement>('input[type="file"]');
	if (!input) throw new Error("File input not found");

	fireEvent.change(input, { target: { files: [createPdfFile()] } });

	return await screen.findByText("Set up a provider");
}

describe("ImportResumeDialog — Set up a provider", () => {
	// https://github.com/amruthpillai/reactive-resume/issues/3307
	it("confirms before leaving instead of navigating behind the dialog", async () => {
		renderDialog();
		const link = await selectPdfFile();

		fireEvent.click(link);

		expect(await screen.findByText("Leave to set up an AI provider?")).toBeInTheDocument();
		expect(navigate).not.toHaveBeenCalled();
		expect(useDialogStore.getState().open).toBe(true);
	});

	it("stays put and keeps the selected file when the user cancels", async () => {
		renderDialog();
		const link = await selectPdfFile();

		fireEvent.click(link);
		fireEvent.click(await screen.findByText("Stay"));

		await waitFor(() => {
			expect(screen.queryByText("Leave to set up an AI provider?")).not.toBeInTheDocument();
		});

		expect(navigate).not.toHaveBeenCalled();
		expect(useDialogStore.getState().open).toBe(true);
		expect(screen.getByText("resume.pdf")).toBeInTheDocument();
	});

	it("closes the dialog and navigates once the user confirms", async () => {
		renderDialog();
		const link = await selectPdfFile();

		fireEvent.click(link);
		fireEvent.click(await screen.findByText("Leave"));

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith({ to: "/dashboard/settings/integrations" });
		});

		expect(useDialogStore.getState().open).toBe(false);
	});

	it("leaves modifier clicks to the browser so the link can open in a new tab", async () => {
		renderDialog();
		const link = await selectPdfFile();

		const event = new MouseEvent("click", { bubbles: true, cancelable: true, metaKey: true });
		fireEvent(link, event);

		expect(event.defaultPrevented).toBe(false);
		expect(screen.queryByText("Leave to set up an AI provider?")).not.toBeInTheDocument();
		expect(navigate).not.toHaveBeenCalled();
	});
});
