import { Stack, useLocalSearchParams } from "expo-router";
import { AssistantScreen } from "@/features/assistant/assistant-screen";

type Params = { id: string; thread?: string; ask?: string; prepare?: string; applicationId?: string };

/** `?thread=` opens a conversation, `?ask=` sends a question in a new one, `?prepare=1` offers next-step starters. */
export default function AssistantRoute() {
	const { id, thread, ask, prepare, applicationId } = useLocalSearchParams<Params>();
	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<AssistantScreen
				resumeId={id}
				threadId={thread}
				ask={ask}
				prepare={prepare === "1"}
				applicationId={applicationId}
			/>
		</>
	);
}
