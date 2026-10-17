import { useLingui } from "@lingui/react/macro";
import { openBrowserAsync } from "expo-web-browser";
import { View } from "react-native";
import { Button, Icon, Text, showToast, useTheme } from "@/ui";

type AuthHeaderProps = {
	subtitle?: string | undefined;
};

/** The app mark and name at the top of the sign-in screens. */
export function AuthHeader({ subtitle }: AuthHeaderProps) {
	const { t } = useLingui();
	const { colors, radius, space } = useTheme();

	return (
		<View style={{ gap: space.s3, paddingTop: space.s6, paddingHorizontal: space.s2 }}>
			<View
				style={{
					width: 52,
					height: 52,
					borderRadius: radius.r2xl,
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: colors.accent,
				}}
			>
				<Icon name="file-text" filled size={28} color={colors.onAccent} />
			</View>
			<Text variant="display" accessibilityRole="header">
				{t`Reactive Resume`}
			</Text>
			{subtitle ? <Text color="ink2">{subtitle}</Text> : null}
			<Button
				label={t`Privacy policy`}
				variant="link"
				onPress={() => {
					void openBrowserAsync("https://docs.rxresu.me/legal/privacy-policy").catch(() =>
						showToast({ message: t`Couldn't open the browser. Try again.` }),
					);
				}}
			/>
		</View>
	);
}

/** The host of an origin, as people type it: `https://rxresu.me` → `rxresu.me`. */
export const hostOf = (origin: string) => origin.replace(/^https?:\/\//, "");
