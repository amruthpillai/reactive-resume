import { Stack } from "expo-router";
import { useTheme } from "@/ui";

export default function ApplicationsLayout() {
	const { colors, type } = useTheme();
	return (
		<Stack
			screenOptions={{
				headerLargeTitle: true,
				headerLargeTitleStyle: { fontFamily: type.largeIOS.fontFamily, color: colors.ink },
			}}
		/>
	);
}
