import { t } from "@lingui/core/macro";
import { GithubLogoIcon, GoogleLogoIcon, PasswordIcon, VaultIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCallback } from "react";
import { toast } from "sonner";
import { match } from "ts-pattern";
import { authClient } from "@/integrations/auth/client";
import type { AuthProvider } from "@/integrations/auth/types";
import { orpc } from "@/integrations/orpc/client";

/**
 * Get the display name for a social provider
 */
export function getProviderName(providerId: AuthProvider): string {
	return match(providerId)
		.with("credential", () => "Password")
		.with("google", () => "Google")
		.with("github", () => "GitHub")
		.with("custom", () => "Custom OAuth")
		.exhaustive();
}

/**
 * Get the icon component for a social provider
 */
export function getProviderIcon(providerId: AuthProvider): ReactNode {
	return match(providerId)
		.with("credential", () => <PasswordIcon />)
		.with("google", () => <GoogleLogoIcon />)
		.with("github", () => <GithubLogoIcon />)
		.with("custom", () => <VaultIcon />)
		.exhaustive();
}

/**
 * Hook to fetch and manage authentication accounts
 */
export function useAuthAccounts() {
	const { data: accounts } = useQuery({
		queryKey: ["auth", "accounts"],
		queryFn: () => authClient.listAccounts(),
		select: ({ data }) => data ?? [],
	});

	const getAccountByProviderId = useCallback(
		(providerId: string) => accounts?.find((account) => account.providerId === providerId),
		[accounts],
	);

	const hasAccount = useCallback(
		(providerId: string) => !!getAccountByProviderId(providerId),
		[getAccountByProviderId],
	);

	return {
		accounts,
		hasAccount,
		getAccountByProviderId,
	};
}

/**
 * Hook to manage authentication provider linking/unlinking
 */
export function useAuthProviderActions() {
	const link = useCallback(async (provider: AuthProvider) => {
		const providerName = getProviderName(provider);
		const toastId = toast.loading(t`Linking your ${providerName} account...`);

		const { error } = await authClient.linkSocial({ provider, callbackURL: "/dashboard/settings/authentication" });

		if (error) {
			toast.error(error.message, { id: toastId });
			return;
		}

		toast.dismiss(toastId);
	}, []);

	const unlink = useCallback(async (provider: AuthProvider, accountId: string) => {
		const providerName = getProviderName(provider);
		const toastId = toast.loading(t`Unlinking your ${providerName} account...`);

		const { error } = await authClient.unlinkAccount({ providerId: provider, accountId });

		if (error) {
			toast.error(error.message, { id: toastId });
			return;
		}

		toast.dismiss(toastId);
	}, []);

	return { link, unlink };
}

/**
 * Hook to get enabled social providers for the current user
 * Possible values: "credential", "google", "github", "custom"
 */
export function useEnabledProviders() {
	const { data: enabledProviders = [] } = useQuery(orpc.auth.providers.list.queryOptions());

	return { enabledProviders };
}
