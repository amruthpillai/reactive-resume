import { Stack } from "expo-router";
import { useTabStackOptions } from "@/shell/app-banner";

export default function SettingsLayout() {
	return <Stack screenOptions={useTabStackOptions()} />;
}
