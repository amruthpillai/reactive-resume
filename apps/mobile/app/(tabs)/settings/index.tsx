import { useLingui } from "@lingui/react/macro";
import { router } from "expo-router";
import { RouteStub } from "@/components/route-stub";
import { routes } from "@/routes";
import { Card, ListRow } from "@/ui";

export default function SettingsScreen() {
	const { t } = useLingui();

	return (
		<RouteStub title={t`Settings`}>
			<Card style={{ padding: 0, overflow: "hidden" }}>
				<ListRow
					title={t`Account`}
					leading="user-circle"
					chevron
					onPress={() => router.push(routes.settings("account"))}
				/>
				<ListRow
					title={t`Preferences`}
					leading="sliders-horizontal"
					chevron
					onPress={() => router.push(routes.settings("preferences"))}
				/>
				<ListRow title={t`AI providers`} leading="sparkle" chevron onPress={() => router.push(routes.settings("ai"))} />
			</Card>
		</RouteStub>
	);
}
