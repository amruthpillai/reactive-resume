// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import AtsPlayground from "./ats-playground";

const { parse } = vi.hoisted(() => ({ parse: vi.fn() }));
vi.mock("@/features/ats-checker/run-ats-check", () => ({ runAtsCheck: parse }));

i18n.loadAndActivate({ locale: "en", messages: {} });

function Playground() {
	return (
		<I18nProvider i18n={i18n}>
			<AtsPlayground />
		</I18nProvider>
	);
}

beforeEach(() => {
	parse.mockReset();
	vi.stubGlobal(
		"fetch",
		vi.fn().mockImplementation(async () => new Response(new Blob(["%PDF sample"]))),
	);
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

it("reads the bundled PDF only after activation and displays the parser's actual text", async () => {
	parse.mockResolvedValue({ fullText: "Jordan Lee\nWork experience\nBuilt accessible products." });
	const view = render(<Playground />);
	expect(fetch).not.toHaveBeenCalled();
	fireEvent.click(view.getByRole("button", { name: "Read this resume" }));
	await waitFor(() => expect(view.getByLabelText("Extracted text")).toHaveTextContent("Built accessible products."));
	expect(fetch).toHaveBeenCalledWith(
		"/templates/pdf/rhyhorn.pdf",
		expect.objectContaining({ signal: expect.any(AbortSignal) }),
	);
	expect(parse.mock.calls[0][0].name).toBe("rhyhorn.pdf");
});

it("allows retry after a failed read and explains PDFs with no text", async () => {
	parse.mockRejectedValueOnce(Object.assign(new Error(), { name: "PdfPasswordRequiredError" }));
	parse.mockResolvedValueOnce({ fullText: "   " });
	const view = render(<Playground />);
	fireEvent.click(view.getByRole("button", { name: "Read this resume" }));
	await waitFor(() => expect(view.getByRole("alert")).toHaveTextContent("password protected"));
	fireEvent.click(view.getByRole("button", { name: "Try again" }));
	await waitFor(() => expect(view.getByLabelText("Extracted text")).toHaveTextContent("No readable text"));
});

it("recovers from sample fetch failure and discards a read cancelled before parsing", async () => {
	vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 503 }));
	let finishFetch: (response: Response) => void = () => {};
	vi.mocked(fetch).mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finishFetch = resolve;
			}),
	);
	const view = render(<Playground />);
	fireEvent.click(view.getByRole("button", { name: "Read this resume" }));
	await waitFor(() => expect(view.getByRole("alert")).toHaveTextContent("try again"));
	fireEvent.click(view.getByRole("button", { name: "Try again" }));
	fireEvent.click(view.getByRole("button", { name: "Cancel" }));
	await act(async () => finishFetch(new Response(new Blob(["%PDF sample"]))));
	expect(parse).not.toHaveBeenCalled();
	expect(view.getByRole("button", { name: "Read this resume" })).toBeEnabled();
	expect(view.getByLabelText("Extracted text")).toHaveTextContent("Read the sample");
});

it("rejects other file types and shows the selected file instead of the sample image", async () => {
	parse.mockResolvedValue({ fullText: "My uploaded resume" });
	const view = render(<Playground />);
	fireEvent.change(view.getByLabelText("Try your PDF"), {
		target: { files: [new File(["text"], "notes.txt", { type: "text/plain" })] },
	});
	expect(view.getByRole("alert")).toHaveTextContent("Choose a PDF");
	expect(parse).not.toHaveBeenCalled();
	fireEvent.change(view.getByLabelText("Try your PDF"), { target: { files: [new File(["%PDF"], "my-resume.PDF")] } });
	await waitFor(() => expect(view.getByLabelText("Extracted text")).toHaveTextContent("My uploaded resume"));
	expect(view.getByText("my-resume.PDF")).toBeInTheDocument();
	expect(view.queryByAltText("Rhyhorn sample resume")).not.toBeInTheDocument();
	expect(fetch).not.toHaveBeenCalled();
});

it("ignores stale parser results after a newer file or reset and aborts on unmount", async () => {
	let finishOld: (value: { fullText: string }) => void = () => {};
	parse.mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finishOld = resolve;
			}),
	);
	parse.mockResolvedValueOnce({ fullText: "Current resume" });
	const view = render(<Playground />);
	fireEvent.click(view.getByRole("button", { name: "Read this resume" }));
	await waitFor(() => expect(parse).toHaveBeenCalledTimes(1));
	const oldSignal = parse.mock.calls[0][1].signal;
	fireEvent.change(view.getByLabelText("Try your PDF"), { target: { files: [new File(["%PDF"], "current.pdf")] } });
	await waitFor(() => expect(view.getByLabelText("Extracted text")).toHaveTextContent("Current resume"));
	await act(async () => finishOld({ fullText: "Stale resume" }));
	expect(oldSignal.aborted).toBe(true);
	expect(view.getByLabelText("Extracted text")).not.toHaveTextContent("Stale resume");
	fireEvent.click(view.getByRole("button", { name: "Reset" }));
	expect(view.getByLabelText("Extracted text")).not.toHaveTextContent("Current resume");
	parse.mockImplementationOnce(() => new Promise(() => {}));
	fireEvent.click(view.getByRole("button", { name: "Read this resume" }));
	await waitFor(() => expect(parse).toHaveBeenCalledTimes(3));
	const signal = parse.mock.calls[2][1].signal;
	view.unmount();
	expect(signal.aborted).toBe(true);
});
