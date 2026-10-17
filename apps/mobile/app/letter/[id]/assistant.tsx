import { Stack, useLocalSearchParams } from "expo-router";
import { LetterAssistantScreen } from "@/features/assistant/assistant-screen";

type Params = { id: string; thread?: string; ask?: string; applicationId?: string };

export default function LetterAssistantRoute() {
	const { id, thread, ask, applicationId } = useLocalSearchParams<Params>();
	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<LetterAssistantScreen letterId={id} threadId={thread} ask={ask} applicationId={applicationId} />
		</>
	);
}
