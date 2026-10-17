import { useLingui } from "@lingui/react/macro";
import { useRouter } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { SettingsGroup, SettingsPage } from "@/features/settings/layout";
import { useProfile } from "@/features/settings/queries";
import { SignOutRow } from "@/features/settings/sign-out";
import { routes } from "@/routes";
import { Avatar, ListRow, Text, showToast, useThemePreference } from "@/ui";

export default function SettingsScreen() {
	const router = useRouter();
	const { t } = useLingui();
	const profile = useProfile();
	const theme = useThemePreference();
	const appearance = { system: t`System`, light: t`Light`, dark: t`Dark` }[theme];
	return (
		<SettingsPage title={t`Settings`} root>
			<SettingsGroup>
				<ListRow
					title={profile.data?.name ?? t`Account`}
					subtitle={profile.data?.email}
					leading={<Avatar name={profile.data?.name ?? t`Account`} uri={profile.data?.image} />}
					chevron
					onPress={() => router.push(routes.settings("account"))}
				/>
			</SettingsGroup>
			<SettingsGroup>
				<ListRow
					title={t`Account`}
					leading="user-circle"
					chevron
					onPress={() => router.push(routes.settings("account"))}
				/>
				<ListRow
					title={t`Preferences`}
					leading="circle-half"
					trailing={<Text color="ink3">{appearance}</Text>}
					chevron
					onPress={() => router.push(routes.settings("preferences"))}
				/>
				<ListRow title={t`AI & developer`} leading="robot" chevron onPress={() => router.push(routes.settings("ai"))} />
			</SettingsGroup>
			<SettingsGroup>
				<SignOutRow switchServer />
				<ListRow
					title={t`Licences`}
					leading="file-text"
					chevron
					onPress={() => router.push("/(tabs)/settings/licences")}
				/>
				<ListRow
					title={t`Help & docs`}
					leading="question"
					onPress={() => {
						void openBrowserAsync("https://docs.rxresu.me").catch(() =>
							showToast({ message: t`Couldn't open the browser. Try again.` }),
						);
					}}
				/>
			</SettingsGroup>
			<SettingsGroup>
				<SignOutRow />
			</SettingsGroup>
			<Text variant="caption" color="ink3" align="center">{t`Reactive Resume · Free and open source · MIT`}</Text>
		</SettingsPage>
	);
}
