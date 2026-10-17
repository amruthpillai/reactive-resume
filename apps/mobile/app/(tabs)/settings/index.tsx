import { Trans, useLingui } from "@lingui/react/macro";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { Platform, View } from "react-native";
import { SettingsGroup, SettingsPage } from "@/features/settings/layout";
import { useProfile } from "@/features/settings/queries";
import { SignOutRow } from "@/features/settings/sign-out";
import { routes } from "@/routes";
import { Avatar, ListRow, Text, showToast, useTheme, useThemePreference } from "@/ui";

export default function SettingsScreen() {
	const router = useRouter();
	const { t } = useLingui();
	const { space } = useTheme();
	const profile = useProfile();
	const openLink = (url: string) => {
		void openBrowserAsync(url).catch(() => showToast({ message: t`Couldn't open the browser. Try again.` }));
	};
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
					title={t`Preferences`}
					leading="circle-half"
					value={appearance}
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
				<ListRow title={t`Help & docs`} leading="question" onPress={() => openLink("https://docs.rxresu.me")} />
				<ListRow
					title={t`Privacy policy`}
					leading="shield-check"
					external
					onPress={() => openLink("https://docs.rxresu.me/legal/privacy-policy")}
				/>
				{Platform.OS !== "ios" ? (
					<ListRow
						title={t`Donate`}
						leading="hand-heart"
						external
						onPress={() => openLink("https://opencollective.com/reactive-resume/donate")}
					/>
				) : null}
				<ListRow
					title={t`Source code on GitHub`}
					leading="code"
					external
					onPress={() => openLink("https://github.com/reactive-resume/reactive-resume")}
				/>
			</SettingsGroup>
			<SettingsGroup>
				<SignOutRow />
			</SettingsGroup>
			<View style={{ alignItems: "center", gap: space.s1 }}>
				<Text variant="caption" color="ink3" align="center">
					Reactive Resume
				</Text>
				<Text variant="caption" color="ink3" align="center">
					<Trans>
						by{" "}
						<Text
							variant="caption"
							color="accentText"
							accessibilityRole="link"
							onPress={() => openLink("https://amruthpillai.com")}
							style={{ textDecorationLine: "underline" }}
						>
							Amruth Pillai
						</Text>
					</Trans>
				</Text>
				<Text variant="caption" color="ink3" align="center">
					v{Constants.expoConfig?.version ?? "—"}
				</Text>
			</View>
		</SettingsPage>
	);
}
