import { Redirect, useLocalSearchParams } from "expo-router";
import { routes } from "@/routes";

export default function BuilderIndex() {
	const { id } = useLocalSearchParams<{ id: string }>();
	return <Redirect href={routes.builder(id)} />;
}
