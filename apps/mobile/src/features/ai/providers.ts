import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";

export { AIProviderSetupSheet } from "./provider-editor";

/** Readiness is unknown on loading/error, even when stale providers remain cached. */
export function useHasAIProvider() {
	const session = useSession();
	const options = orpc.aiProviders.list.queryOptions();
	const query = useQuery({
		...options,
		queryKey: [...options.queryKey, session.server],
		enabled: session.status === "signed-in",
	});
	const available = session.status === "signed-in" && query.isSuccess;
	const providers = available ? query.data : [];
	const usableProviders = providers.filter((provider) => provider.enabled && provider.testStatus === "success");
	return {
		providers,
		usableProviders,
		// The server orders explicit default first, then most recently used runnable fallback.
		defaultProvider: usableProviders[0] ?? null,
		hasAIProvider: usableProviders.length > 0,
		isLoading: query.isPending,
		isUnavailable: !available,
		error: query.error,
		retry: () => void query.refetch(),
	};
}
