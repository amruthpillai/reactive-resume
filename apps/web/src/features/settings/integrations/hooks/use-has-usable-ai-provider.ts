import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/libs/orpc/client";

/**
 * Single source of truth for "is an AI provider ready to use" (enabled AND its connection test succeeded).
 * Replaces the predicate that was duplicated across the import dialog, agent setup, and AI settings.
 */
export function useHasUsableAiProvider() {
	const { data: providers, isLoading } = useQuery(orpc.aiProviders.list.queryOptions());
	const usableProviders = (providers ?? []).filter((provider) => provider.enabled && provider.testStatus === "success");

	return {
		hasUsableProvider: usableProviders.length > 0,
		usableProviders,
		isLoading,
	};
}
