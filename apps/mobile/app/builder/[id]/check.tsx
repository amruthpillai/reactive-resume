import { useLocalSearchParams } from "expo-router";
import { useSession } from "@/auth/session";
import { CheckScreen } from "@/features/check/screen";

export default function CheckRoute() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const session = useSession();
	return <CheckScreen key={`${id}:${session.server}:${session.status}`} id={id} />;
}
