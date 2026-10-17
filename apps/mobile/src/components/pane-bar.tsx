import type { IconName } from "@/ui";
import { useLingui } from "@lingui/react/macro";
import { router, useSegments } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, IconButton, Text, useTheme } from "@/ui";

export type Pane<T extends string> = { pane: T; label: string; icon: IconName; href: string };

/**
 * Leaves the editor from a pane. Panes are the first screen of the editor's own stack, which shows no back button
 * on iOS. M2-T2 replaces it with the editor top bar.
 */
export function PaneBackButton() {
	const { t } = useLingui();
	return <IconButton icon="caret-left" label={t`Back`} onPress={() => router.back()} />;
}

type PaneBarProps<T extends string> = {
	panes: Pane<T>[];
};

/**
 * The phone bottom bar of the builder and letter editor (Write, Page, Design, Check). Switching replaces the
 * route, so back leaves the editor instead of stepping through panes. Hidden on screens that are not a pane.
 * M2-T2 styles it and adds the tablet split.
 */
export function PaneBar<T extends string>({ panes }: PaneBarProps<T>) {
	const segments = useSegments();
	const insets = useSafeAreaInsets();
	const { colors, size, space } = useTheme();
	const current = segments.at(-1);

	if (!panes.some(({ pane }) => pane === current)) return null;

	return (
		<View
			accessibilityRole="tablist"
			style={{
				flexDirection: "row",
				paddingBottom: insets.bottom,
				backgroundColor: colors.surface,
				borderTopWidth: 1,
				borderTopColor: colors.line,
			}}
		>
			{panes.map(({ pane, label, icon, href }) => {
				const active = pane === current;
				return (
					<Pressable
						key={pane}
						accessibilityRole="tab"
						accessibilityState={{ selected: active }}
						onPress={() => !active && router.replace(href)}
						style={{ flex: 1, minHeight: size.tabBar, alignItems: "center", justifyContent: "center", gap: space.s0 }}
					>
						<Icon name={icon} filled={active} color={active ? colors.accent : colors.ink2} size={size.icon.bar} />
						<Text variant="micro" color={active ? "accentText" : "ink2"}>
							{label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}
