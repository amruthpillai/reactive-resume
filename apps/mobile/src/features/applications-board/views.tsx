import type { ReactNode } from "react";
import { useLingui } from "@lingui/react/macro";
import { router, Stack } from "expo-router";
import { useWindowDimensions, View } from "react-native";
import { Segmented, useTheme } from "@/ui";

export type ApplicationsView = "list" | "board" | "calendar" | "insights";

// Sibling routes under app/(tabs)/applications. Kept here until routes.ts (M1 contract) gains them.
const HREFS = {
	list: "/applications",
	board: "/applications/board",
	calendar: "/applications/calendar",
	insights: "/applications/insights",
} as const satisfies Record<ApplicationsView, string>;

/** Tablet layout from 700 pt wide, the shell's `useIsTablet()` rule (M2-T2); switch to that hook once it merges. */
export function useIsTablet() {
	return useWindowDimensions().width >= 700;
}

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
						if (view !== current) router.replace(HREFS[view]);
					}}
				/>
			</View>
			<View style={{ flex: 1 }}>{children}</View>
		</View>
	);
}
