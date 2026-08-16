// @vitest-environment happy-dom

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfirmDialogProvider } from "@/hooks/use-confirm";

const listApiKeys = vi.hoisted(() => vi.fn());

vi.mock("@/libs/auth/client", () => ({
	authClient: { apiKey: { list: listApiKeys } },
}));

i18n.loadAndActivate({ locale: "en", messages: {} });

const { ApiKeysSettingsPage } = await import("./api-keys");

describe("ApiKeysSettingsPage", () => {
	it("shows active keys that never expire", async () => {
		listApiKeys.mockResolvedValue({
			data: {
				apiKeys: [
					{
						id: "key-1",
						configId: "default",
						name: "no-expiry-test",
						start: "rr_no_expiry",
						prefix: null,
						referenceId: "user-1",
						refillInterval: null,
						refillAmount: null,
						lastRefillAt: null,
						enabled: true,
						rateLimitEnabled: false,
						rateLimitTimeWindow: null,
						rateLimitMax: null,
						requestCount: 0,
						remaining: null,
						lastRequest: null,
						expiresAt: null,
						createdAt: new Date("2026-08-16T10:00:00Z"),
						updatedAt: new Date("2026-08-16T10:00:00Z"),
						metadata: null,
						permissions: null,
					},
				],
				total: 1,
				limit: undefined,
				offset: undefined,
			},
			error: null,
		});

		render(
			<I18nProvider i18n={i18n}>
				<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
					<ConfirmDialogProvider>
						<ApiKeysSettingsPage />
					</ConfirmDialogProvider>
				</QueryClientProvider>
			</I18nProvider>,
		);

		await waitFor(() => expect(screen.getByText("rr_no_expiry...")).toBeInTheDocument());
		expect(screen.getByText("Never expires")).toBeInTheDocument();
	});
});
