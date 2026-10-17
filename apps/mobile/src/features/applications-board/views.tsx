import type { ApplicationsView } from "@/routes";
import type { ReactNode } from "react";
import { useLingui } from "@lingui/react/macro";
import { router, Stack } from "expo-router";
import { View } from "react-native";
import { routes } from "@/routes";
import { Segmented, useTheme } from "@/ui";

type ApplicationsViewFrameProps = { current: ApplicationsView; children: ReactNode };

/** The List / Board / Calendar / Insights switch above each Applications view (mockup `viewTabs`). */
export function ApplicationsViewFrame({ current, children }: ApplicationsViewFrameProps) {
	const { t } = useLingui();
	const { colors, space } = useTheme();
	return (
		<View style={{ flex: 1, backgroundColor: colors.bg }}>
			{/* Views swap in place: no push animation, no back stack between them. */}
			<Stack.Screen options={{ title: t`Applications`, animation: "none" }} />
			<View style={{ paddingHorizontal: space.s4, paddingTop: space.s2, paddingBottom: space.s1 }}>
				<Segmented
					label={t`Application views`}
					value={current}
					options={[
						{ value: "list", label: t`List` },
						{ value: "board", label: t`Board` },
						{ value: "calendar", label: t`Calendar` },
						{ value: "insights", label: t`Insights` },
					]}
					onChange={(view) => {
						if (view !== current) router.replace(routes.applications(view));
					}}
				/>
			</View>
			<View style={{ flex: 1 }}>{children}</View>
		</View>
	);
}
