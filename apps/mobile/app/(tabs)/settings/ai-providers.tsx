import { useLingui } from "@lingui/react/macro";
import { Stack } from "expo-router";
import { ProviderList } from "@/features/ai/provider-list";
import { Screen, Text } from "@/ui";

export default function ProvidersScreen() {
	const { t } = useLingui();
	return (
		<Screen>
			<Stack.Screen options={{ title: t`AI providers` }} />
			<Text color="ink2">{t`Writing help, tailored suggestions and the assistant. The default provider is used wherever you don't pick one. Your keys stay encrypted.`}</Text>
			<ProviderList />
		</Screen>
	);
}
