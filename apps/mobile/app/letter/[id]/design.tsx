import { useLocalSearchParams } from "expo-router";
import { LetterDesign } from "@/features/letters/design";

export default function LetterDesignScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	return <LetterDesign id={id} />;
}
