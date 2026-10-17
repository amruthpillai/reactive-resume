import type { ApplicationTab } from "@/routes";
import type { ReactNode } from "react";
import { useLingui } from "@lingui/react/macro";
import { router, useGlobalSearchParams, useLocalSearchParams, useNavigation } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { WORKSPACE_TABS } from "@reactive-resume/schema/career";
import { createSlot } from "./slot";
import { TopBar } from "./top-bar";
import { useIsTablet } from "./use-is-tablet";
import { routes } from "@/routes";
import { Text, useTheme } from "@/ui";

/** What workspace tabs put into the application chrome with `useWorkspaceChrome`. */
export type WorkspaceChromeSlots = {
	/** The company. Defaults to "Application". */
	title?: string | undefined;
	/** "Senior Game Developer · Interview". */
	subtitle?: string | undefined;
	/** Top-bar buttons: Application details, Ask coach. */
	actions?: ReactNode;
	/** Tablet: the 270 pt context column beside the tab (dates, links, people). */
	context?: ReactNode;
	/** Under the tab strip, full width: the read-only saved-version banner. */
	banner?: ReactNode;
	/** Badges after a tab's name, for example `{ messages: "2 unread" }`. */
	badges?: Partial<Record<ApplicationTab, ReactNode>> | undefined;
};

const slot = createSlot<WorkspaceChromeSlots>();

/** True for the workspace tabs; other `[tab]` values (`details`) get no workspace chrome. */
export const isWorkspaceTab = (tab: string | undefined): tab is ApplicationTab =>
	(WORKSPACE_TABS as readonly string[]).includes(tab ?? "");

/** Fills the application workspace chrome from a screen inside `app/applications/[id]`. */
export const useWorkspaceChrome = slot.useFill;

// career.html `.tablet .split`: the context column is 270 pt.
const contextWidth = 270;

/**
 * The application workspace shell (career.html): top bar with Back to applications, the company and role, then the
 * Fit … Saved tab strip, which scrolls sideways. On tablet the `context` column sits beside the tab.
 */
export function WorkspaceChrome({ children }: { children: ReactNode }) {
	return (
		<slot.Provider>
			<Frame>{children}</Frame>
		</slot.Provider>
	);
}

function Frame({ children }: { children: ReactNode }) {
	const { t } = useLingui();
	const tablet = useIsTablet();
	const navigation = useNavigation();
	const slots = slot.useSlot();
	const { id } = useLocalSearchParams<{ id: string }>();
	// The tab is the child route's param, so the layout reads it globally.
	const { tab } = useGlobalSearchParams<{ tab?: string }>();
	const { colors, size, space } = useTheme();

	if (!isWorkspaceTab(tab)) return <View style={{ flex: 1 }}>{children}</View>;

	const labels: Record<ApplicationTab, string> = {
		fit: t({ message: "Fit", context: "Application workspace tab: how well a job fits your experience" }),
		apply: t`Apply`,
		prepare: t`Prepare`,
		practise: t`Practise`,
		debrief: t`Debrief`,
		messages: t`Messages`,
		saved: t({ message: "Saved", context: "Application workspace tab: earlier results kept for this job" }),
	};

	return (
		<View style={{ flex: 1, backgroundColor: colors.bg }}>
			<TopBar
				backLabel={t`Back to applications`}
				onBack={() => (navigation.canGoBack() ? navigation.goBack() : router.replace(routes.applications()))}
				title={slots.title ?? t`Application`}
				subtitle={
					slots.subtitle ? (
						<Text variant="caption" color="ink3" numberOfLines={1}>
							{slots.subtitle}
						</Text>
					) : null
				}
				actions={slots.actions}
			/>
			<View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line }}>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					accessibilityRole="tablist"
					contentContainerStyle={{ paddingHorizontal: space.s3, gap: space.s1 }}
				>
					{WORKSPACE_TABS.map((name) => {
						const active = name === tab;
						return (
							<Pressable
								key={name}
								accessibilityRole="tab"
								accessibilityState={{ selected: active }}
								onPress={() => !active && router.replace(routes.application(id, name))}
								style={({ pressed }) => ({
									flexDirection: "row",
									alignItems: "center",
									gap: space.s1,
									minHeight: size.hit,
									paddingHorizontal: space.s3,
									borderBottomWidth: space.s0,
									borderBottomColor: active ? colors.accent : "transparent",
									backgroundColor: pressed ? colors.press : "transparent",
								})}
							>
								<Text variant={active ? "label" : "body"} color={active ? "accentText" : "ink2"}>
									{labels[name]}
								</Text>
								{slots.badges?.[name]}
							</Pressable>
						);
					})}
				</ScrollView>
			</View>
			{slots.banner}
			<KeyboardAvoidingView behavior="padding" automaticOffset style={{ flex: 1, flexDirection: "row" }}>
				{tablet && slots.context ? (
					<View
						style={{
							width: contextWidth,
							padding: space.s6,
							borderEndWidth: 1,
							borderEndColor: colors.line,
						}}
					>
						{slots.context}
					</View>
				) : null}
				<View style={{ flex: 1 }}>{children}</View>
			</KeyboardAvoidingView>
		</View>
	);
}
