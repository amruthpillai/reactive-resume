import { useLocalSearchParams } from "expo-router";
import { ShareScreen } from "@/features/share/screen";

export default function ShareRoute() {
	const { id } = useLocalSearchParams<{ id: string }>();
	return <ShareScreen id={id} />;
}
