import type { ThemePreference } from "@/ui";
import { useLingui } from "@lingui/react/macro";
import { RouteStub } from "@/components/route-stub";
import { Segmented, Text, setThemePreference, useThemePreference } from "@/ui";

export default function PreferencesScreen() {
	const { t } = useLingui();
	const theme = useThemePreference();

	return (
		<RouteStub title={t`Preferences`}>
			<Text variant="caption" color="ink2">
				{t`Appearance`}
			</Text>
			<Segmented<ThemePreference>
				label={t`Theme`}
				value={theme}
				onChange={setThemePreference}
				options={[
					{ value: "system", label: t`System` },
					{ value: "light", label: t`Light` },
					{ value: "dark", label: t`Dark` },
				]}
			/>
		</RouteStub>
	);
}
