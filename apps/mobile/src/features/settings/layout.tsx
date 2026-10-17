import type { ReactNode } from "react";
import { Stack } from "expo-router";
import { View } from "react-native";
import { useIsTablet } from "@/shell/use-is-tablet";
import { Card, Screen, Text, useTheme } from "@/ui";

type SettingsPageProps = { title: string; children: ReactNode; root?: boolean };
export function SettingsPage({ title, children, root = false }: SettingsPageProps) {
	const tablet = useIsTablet();
	return (
		<Screen>
			<Stack.Screen options={{ title, headerLargeTitle: root && !tablet }} />
			{children}
		</Screen>
	);
}

type SettingsGroupProps = { title?: string; note?: string; children: ReactNode };
export function SettingsGroup({ title, note, children }: SettingsGroupProps) {
	const { space } = useTheme();
	return (
		<View style={{ gap: space.s2 }}>
			{title ? (
				<Text variant="caption" color="ink2">
					{title}
				</Text>
			) : null}
			<Card style={{ padding: 0, overflow: "hidden" }}>{children}</Card>
			{note ? (
				<Text variant="callout" color="ink3">
					{note}
				</Text>
			) : null}
		</View>
	);
}
