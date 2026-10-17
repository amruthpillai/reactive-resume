import type { IconName } from "@/ui";
import { useLingui } from "@lingui/react/macro";
import { router } from "expo-router";
import { Tabs } from "expo-router/tabs";
import { View } from "react-native";
import { routes } from "@/routes";
import { Icon, useTheme } from "@/ui";

type TabIconProps = {
	name: IconName;
	focused: boolean;
	color: string;
};

function TabIcon({ name, focused, color }: TabIconProps) {
	const { size } = useTheme();
	return <Icon name={name} filled={focused} color={color} size={size.icon.bar} />;
}

function NewTabIcon() {
	const { colors, radius, size } = useTheme();
	return (
		<View
			style={{
				...size.newPill,
				borderRadius: radius.rPill,
				backgroundColor: colors.accent,
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<Icon name="plus" color={colors.onAccent} size={size.icon.meta} />
		</View>
	);
}

/** Five tabs: Documents, Applications, the raised "+" (opens New as a modal), Career, Settings. M2-T2 styles them. */
export default function TabsLayout() {
	const { t } = useLingui();
	const { colors, type } = useTheme();
	const icon =
		(name: IconName) =>
		({ focused }: { focused: boolean }) => (
			<TabIcon name={name} focused={focused} color={focused ? colors.accent : colors.ink2} />
		);

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: colors.accent,
				tabBarInactiveTintColor: colors.ink2,
				tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
				tabBarLabelStyle: { fontFamily: type.micro.fontFamily, fontSize: type.micro.fontSize },
			}}
		>
			<Tabs.Screen name="documents" options={{ title: t`Documents`, tabBarIcon: icon("file-text") }} />
			<Tabs.Screen name="applications" options={{ title: t`Applications`, tabBarIcon: icon("briefcase") }} />
			<Tabs.Screen
				name="create"
				options={{ title: t`New`, tabBarLabel: () => null, tabBarIcon: () => <NewTabIcon /> }}
				listeners={{
					tabPress: (event) => {
						event.preventDefault();
						router.push(routes.new());
					},
				}}
			/>
			<Tabs.Screen name="career" options={{ title: t`Career`, tabBarIcon: icon("compass") }} />
			<Tabs.Screen name="settings" options={{ title: t`Settings`, tabBarIcon: icon("gear-six") }} />
		</Tabs>
	);
}
