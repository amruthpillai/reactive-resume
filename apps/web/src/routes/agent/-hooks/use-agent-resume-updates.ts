import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useResumeUpdateSubscription } from "@/features/resume/builder/draft";
import { orpc } from "@/libs/orpc/client";

type UseAgentResumeUpdateSubscriptionInput = {
	resumeId?: string;
	threadId: string;
};

export function useAgentResumeUpdateSubscription({ resumeId, threadId }: UseAgentResumeUpdateSubscriptionInput) {
	const queryClient = useQueryClient();

	const onUpdate = useCallback(async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: orpc.agent.threads.list.queryKey() }),
			queryClient.invalidateQueries({ queryKey: orpc.agent.threads.get.queryKey({ input: { id: threadId } }) }),
		]);
	}, [queryClient, threadId]);

	useResumeUpdateSubscription({
		resumeId,
		onUpdate,
		onError: useCallback((error: unknown) => {
			console.warn("Agent resume update stream failed, reconnecting:", error);
		}, []),
	});
}
