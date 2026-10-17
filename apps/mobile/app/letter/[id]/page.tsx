import { useLocalSearchParams } from "expo-router";
import { LetterPage } from "@/features/letters/page";

/** Also rendered beside the panel on tablet by the letter layout, so it reads the id without being focused. */
export default function LetterPageScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	return <LetterPage id={id} />;
}
