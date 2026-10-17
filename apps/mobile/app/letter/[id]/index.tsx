import { Redirect, useLocalSearchParams } from "expo-router";
import { routes } from "@/routes";

export default function LetterIndex() {
	const { id } = useLocalSearchParams<{ id: string }>();
	return <Redirect href={routes.letter(id)} />;
}
