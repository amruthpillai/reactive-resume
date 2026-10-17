import type { LetterPane } from "@/routes";
import { useLingui } from "@lingui/react/macro";
import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { PaneBackButton, PaneBar } from "@/components/pane-bar";
import { routes } from "@/routes";

const panes = new Set(["write", "design"]);

/** Cover letter editor: Write and Design panes. */
export default function LetterLayout() {
	const { t } = useLingui();
	const { id } = useLocalSearchParams<{ id: string }>();

	return (
		<View style={{ flex: 1 }}>
			<Stack
				screenOptions={({ route }) => ({
					animation: "none",
					...(panes.has(route.name) ? { headerLeft: () => <PaneBackButton /> } : {}),
				})}
			/>
			<PaneBar<LetterPane>
				panes={[
					{ pane: "write", label: t`Write`, icon: "pencil-simple", href: routes.letter(id, "write") },
					{ pane: "design", label: t`Design`, icon: "palette", href: routes.letter(id, "design") },
				]}
			/>
		</View>
	);
}
