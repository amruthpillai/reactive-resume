import { useLingui } from "@lingui/react/macro";
import { Stack, usePathname, useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaInsetsContext, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { routes } from "@/routes";
import { useTabStackOptions } from "@/shell/app-banner";
import { Button, useTheme } from "@/ui";

export default function CareerLayout() {
	const { t } = useLingui();
	const { colors, space } = useTheme();
	const insets = useSafeAreaInsets();
	const stackOptions = useTabStackOptions(true);
	const pathname = usePathname();
	const router = useRouter();
	const tabs = [
		{ value: "today", label: t`Today` },
		{ value: "coach", label: t`Coach` },
		{ value: "knowledge", label: t`Knowledge` },
		{ value: "offers", label: t`Offers` },
	] as const;
	return (
		<SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.bg }}>
			<View>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ paddingHorizontal: space.s4, gap: space.s2 }}
				>
					{tabs.map((tab) => (
						<Button
							key={tab.value}
							variant={pathname.endsWith(`/${tab.value}`) ? "primary" : "ghost"}
							label={tab.label}
							onPress={() => router.replace(routes.career(tab.value))}
						/>
					))}
				</ScrollView>
			</View>
			{/* Plain content needs an opaque header; SafeAreaView already clears the status bar. */}
			<SafeAreaInsetsContext value={{ ...insets, top: 0, left: 0, right: 0 }}>
				<Stack screenOptions={{ ...stackOptions, headerTransparent: false }} />
			</SafeAreaInsetsContext>
		</SafeAreaView>
	);
}
