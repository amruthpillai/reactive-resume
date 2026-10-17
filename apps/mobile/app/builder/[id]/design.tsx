import { useLingui } from "@lingui/react/macro";
import { Stack, useLocalSearchParams } from "expo-router";
import { DesignPane } from "@/features/design/design-pane";

export default function DesignScreen() {
	const { t } = useLingui();
	const { id } = useLocalSearchParams<{ id: string }>();
	return (
		<>
			<Stack.Screen options={{ title: t`Design`, headerTransparent: false }} />
			<DesignPane id={id} />
		</>
	);
}
