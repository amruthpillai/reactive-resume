// @vitest-environment happy-dom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({ publicClient: vi.fn(), consent: vi.fn() }));
vi.mock("@/libs/auth/client", () => ({ authClient: { oauth2: mocks } }));
const { OAuthConsentPage } = await import("./consent");
const oauthQuery =
	"client_id=client&scope=openid+profile+email+offline_access&resource=one&resource=two&exp=123&sig=signed";

beforeAll(() => i18n.loadAndActivate({ locale: "en", messages: {} }));
beforeEach(() => {
	vi.resetAllMocks();
	mocks.publicClient.mockResolvedValue({ data: { client_name: "Test client" } });
	mocks.consent.mockResolvedValue({ data: { redirect: true, url: "http://localhost/callback?code=code" } });
});

function renderPage(query = oauthQuery) {
	return render(
		<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
			<I18nProvider i18n={i18n}>
				<OAuthConsentPage oauthQuery={query} email="owner@example.com" />
			</I18nProvider>
		</QueryClientProvider>,
	);
}

it("shows the client and account permissions without granting access", async () => {
	renderPage();
	await screen.findByRole("button", { name: "Allow access" });
	expect(screen.getByText("Test client")).toBeVisible();
	expect(screen.getByText(/owner@example.com/)).toBeVisible();
	expect(screen.getByText(/reading and changing your resumes and job applications/)).toBeVisible();
	expect(screen.getByText("Read your profile information.")).toBeVisible();
	expect(screen.getByText("Read your email address.")).toBeVisible();
	expect(screen.getByText("Keep access when you are not using the application.")).toBeVisible();
	expect(mocks.consent).not.toHaveBeenCalled();
});

it.each([true, false])("sends explicit accept=%s with the original signed query", async (accept) => {
	renderPage();
	await userEvent.click(await screen.findByRole("button", { name: accept ? "Allow access" : "Deny" }));
	expect(mocks.consent).toHaveBeenCalledExactlyOnceWith({ accept, oauth_query: oauthQuery });
	expect(screen.getByRole("button", { name: "Allow access" })).toBeDisabled();
	expect(screen.getByRole("button", { name: "Deny" })).toBeDisabled();
});

it.each(["", "client_id=client"])("offers no approval for an incomplete request %s", async (query) => {
	renderPage(query);
	expect(await screen.findByRole("alert")).toHaveTextContent("invalid or has expired");
	expect(screen.queryByRole("button", { name: "Allow access" })).not.toBeInTheDocument();
	expect(mocks.publicClient).not.toHaveBeenCalled();
	expect(mocks.consent).not.toHaveBeenCalled();
});

it("offers no approval for an unknown or disabled client", async () => {
	mocks.publicClient.mockResolvedValue({ error: { message: "not found" } });
	renderPage();
	expect(await screen.findByRole("alert")).toHaveTextContent("invalid or has expired");
	expect(screen.queryByRole("button", { name: "Allow access" })).not.toBeInTheDocument();
});

it.each([{}, { data: { redirect: true } }, { error: { message: "Invalid signature" } }])(
	"keeps malformed or rejected approvals on screen %j",
	async (response) => {
		mocks.consent.mockResolvedValue(response);
		renderPage();
		await userEvent.click(await screen.findByRole("button", { name: "Allow access" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("Restart the connection");
		expect(screen.getByRole("button", { name: "Allow access" })).toBeEnabled();
	},
);

it("recovers from a network error and blocks duplicate submissions", async () => {
	mocks.consent.mockRejectedValueOnce(new Error("network"));
	renderPage();
	await userEvent.click(await screen.findByRole("button", { name: "Allow access" }));
	await screen.findByRole("alert");
	mocks.consent.mockImplementationOnce(() => new Promise(() => {}));
	await userEvent.click(screen.getByRole("button", { name: "Allow access" }));
	await userEvent.click(screen.getByRole("button", { name: "Deny" }));
	await waitFor(() => expect(mocks.consent).toHaveBeenCalledTimes(2));
});

it("renders client supplied markup as text", async () => {
	mocks.publicClient.mockResolvedValue({ data: { client_name: '<img src="https://untrusted.example/tracker">' } });
	renderPage();
	await screen.findByRole("button", { name: "Allow access" });
	expect(screen.getByText(/<img src=/)).toBeVisible();
	expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
