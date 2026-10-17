import { useLingui } from "@lingui/react/macro";
import { useNetworkState } from "expo-network";
import { router } from "expo-router";
import { Tabs } from "expo-router/tabs";
import { View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";
import { routes } from "@/routes";
import { AppStrip, useAppBanners } from "@/shell/app-banner";
import { AppSidebar, PhoneTabBar } from "@/shell/app-tabs";
import { useIsTablet } from "@/shell/use-is-tablet";
import { useTheme } from "@/ui";

/**
 * Five tabs: Documents, Applications, the raised "+" (opens New as a modal), Career, Settings. Phone: the bottom tab
 * bar. Tablet: the 240 pt sidebar. The offline strip (from the network state) and any `setAppBanner` banners sit
 * under the status bar above every tab. Screens end at the top of the keyboard.
 */
export default function TabsLayout() {
	const { t } = useLingui();
	const tablet = useIsTablet();
	const insets = useSafeAreaInsets();
	const network = useNetworkState();
	const offline = network.isConnected === false || network.isInternetReachable === false;
	const banners = [...useAppBanners()];
	const { colors } = useTheme();
	if (offline) {
		banners.unshift([
			"offline",
			<AppStrip
				key="offline"
				tone="info"
				icon="cloud-slash"
				message={t`Offline. Edits are saved on this device and sync when you reconnect.`}
			/>,
		]);
	}
	const hasBanners = banners.length > 0;

	return (
		<View style={{ flex: 1, backgroundColor: colors.bg }}>
			{hasBanners ? (
				<View style={{ paddingTop: insets.top, paddingStart: insets.left, paddingEnd: insets.right }}>
					{banners.map(([key, banner]) => (
						<View key={key}>{banner}</View>
					))}
				</View>
			) : null}
			{/* Under a banner the status bar is already cleared, so the tabs' headers must not pad it again. */}
			<SafeAreaInsetsContext value={hasBanners ? { ...insets, top: 0 } : insets}>
				<KeyboardAvoidingView behavior="padding" automaticOffset style={{ flex: 1 }}>
					<Tabs
						tabBar={(props) => (tablet ? <AppSidebar {...props} /> : <PhoneTabBar {...props} />)}
						screenOptions={{ headerShown: false, tabBarPosition: tablet ? "left" : "bottom" }}
					>
						<Tabs.Screen name="documents" options={{ title: t`Documents` }} />
						<Tabs.Screen name="applications" options={{ title: t`Applications` }} />
						<Tabs.Screen
							name="create"
							options={{ title: t`New` }}
							listeners={{
								tabPress: (event) => {
									event.preventDefault();
									router.push(routes.new());
								},
							}}
						/>
						<Tabs.Screen name="career" options={{ title: t`Career` }} />
						<Tabs.Screen name="settings" options={{ title: t`Settings` }} />
					</Tabs>
				</KeyboardAvoidingView>
			</SafeAreaInsetsContext>
		</View>
	);
}
