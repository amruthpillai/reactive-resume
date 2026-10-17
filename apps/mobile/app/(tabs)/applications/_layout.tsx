import { Stack } from "expo-router";
import { useTabStackOptions } from "@/shell/app-banner";

export default function ApplicationsLayout() {
	return <Stack screenOptions={useTabStackOptions()} />;
}
