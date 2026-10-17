import { Stack } from "expo-router";
import { useTabStackOptions } from "@/shell/app-banner";

export default function DocumentsLayout() {
	return <Stack screenOptions={useTabStackOptions()} />;
}
