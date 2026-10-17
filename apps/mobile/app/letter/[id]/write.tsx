import { useLocalSearchParams } from "expo-router";
import { LetterWrite } from "@/features/letters/write";

export default function LetterWriteScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	return <LetterWrite id={id} />;
}
