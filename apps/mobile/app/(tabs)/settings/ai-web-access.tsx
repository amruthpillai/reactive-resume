import { useLingui } from "@lingui/react/macro";
import { Stack } from "expo-router";
import { WebAccessSettings } from "@/features/ai/web-access";
import { Screen, Text } from "@/ui";

export default function WebAccessScreen() {
	const { t } = useLingui();
	return (
		<Screen>
			<Stack.Screen options={{ title: t`Web access` }} />
			<Text color="ink2">{t`Read the job links you save. Saving and preparing jobs works without a connection.`}</Text>
			<WebAccessSettings />
		</Screen>
	);
}
