import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect } from "react";
import { AppState } from "react-native";
import { orpc } from "@/api/client";
import { useSession } from "@/auth/session";

export function useProfile() {
	const session = useSession();
	const queryClient = useQueryClient();
	const query = useQuery(
		orpc.auth.getProfile.queryOptions({
			queryKey: [...orpc.auth.getProfile.key(), session.server],
			enabled: session.status === "signed-in",
			retry: false,
		}),
	);
	const { refetch } = query;
	useFocusEffect(
		useCallback(() => {
			if (session.status === "signed-in") void refetch();
		}, [refetch, session.status]),
	);
	useEffect(() => {
		const listener = AppState.addEventListener("change", (state) => {
			if (state === "active" && session.status === "signed-in") {
				void queryClient.invalidateQueries({ queryKey: orpc.auth.getProfile.key() });
				void queryClient.invalidateQueries({ queryKey: orpc.auth.apiKeys.list.key() });
			}
		});
		return () => listener.remove();
	}, [queryClient, session.status]);
	return query;
}
