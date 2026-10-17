import type { BuilderPane } from "@/routes";
import { useLingui } from "@lingui/react/macro";
import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { PaneBackButton, PaneBar } from "@/components/pane-bar";
import { routes } from "@/routes";

const panes = new Set(["write", "page", "design", "check"]);

/** Resume builder: Write, Page, Design and Check panes, plus entry, share, history and assistant on top. */
export default function BuilderLayout() {
	const { t } = useLingui();
	const { id } = useLocalSearchParams<{ id: string }>();

	return (
		<View style={{ flex: 1 }}>
			<Stack
				screenOptions={({ route }) => ({
					animation: "none",
					...(panes.has(route.name) ? { headerLeft: () => <PaneBackButton /> } : {}),
				})}
			>
				<Stack.Screen name="entry/[section]/[item]" options={{ animation: "default" }} />
				<Stack.Screen name="share" options={{ presentation: "modal" }} />
				<Stack.Screen name="history" options={{ animation: "default" }} />
				<Stack.Screen name="assistant" options={{ presentation: "modal" }} />
			</Stack>
			<PaneBar<BuilderPane>
				panes={[
					{ pane: "write", label: t`Write`, icon: "pencil-simple", href: routes.builder(id, "write") },
					{ pane: "page", label: t`Page`, icon: "file-text", href: routes.builder(id, "page") },
					{ pane: "design", label: t`Design`, icon: "palette", href: routes.builder(id, "design") },
					{ pane: "check", label: t`Check`, icon: "check-circle", href: routes.builder(id, "check") },
				]}
			/>
		</View>
	);
}
