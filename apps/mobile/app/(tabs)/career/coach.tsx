import { useLocalSearchParams } from "expo-router";
import { CoachScreen, offerIdsFrom } from "@/features/assistant/coach-screen";

/** `?offers=` carries the saved offers chosen in Offers → Plan what to ask. */
export default function CoachRoute() {
	const { offers } = useLocalSearchParams<{ offers?: string | string[] }>();
	return <CoachScreen offerIds={offerIdsFrom(offers)} />;
}
