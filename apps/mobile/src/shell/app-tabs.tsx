import type { IconName } from "@/ui";
import type { BottomTabBarProps } from "expo-router/tabs";
import type { ReactNode } from "react";
import { useLingui } from "@lingui/react/macro";
import { useRouter, usePathname } from "expo-router";
import { Platform, Pressable, View } from "react-native";
import { useKeyboardState } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { routes } from "@/routes";
import { Button, Icon, Text, haptics, useTheme } from "@/ui";

/** The tab routes of `app/(tabs)`, in tab-bar order. `create` is the raised "+" that opens New. */
const appTabIcons: Record<string, IconName> = {
	documents: "file-text",
	applications: "briefcase",
	career: "compass",
	settings: "gear-six",
};

// tokens.md §7: the iOS active-tab marker and the Android active-tab pill; Android tab cells are 64 tall (app.html).
const iosMarker = { width: 28, height: 3 };
const androidPill = { width: 56, height: 30 };
const androidTabHeight = 64;
const badgeMinWidth = 18;

/** Applications shows a quiet count of open applications; every other badge is a filled unread count. */
const quietBadges = new Set(["applications"]);

type TabRoute = BottomTabBarProps["state"]["routes"][number];

function useTabPress({ state, emitter, navigateToTab }: BottomTabBarProps) {
	return (route: TabRoute) => {
		const focused = state.routes[state.index]?.key === route.key;
		const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
		if (!focused && !event.defaultPrevented) navigateToTab(route.key);
	};
}

const tabLabel = ({ descriptors }: BottomTabBarProps, route: TabRoute) => {
	const { title, tabBarLabel } = descriptors[route.key]?.options ?? {};
	return typeof tabBarLabel === "string" ? tabBarLabel : (title ?? route.name);
};

const tabBadge = ({ descriptors }: BottomTabBarProps, route: TabRoute) => descriptors[route.key]?.options.tabBarBadge;

/** `quiet`: a grey count. `accent`: unread. `warn`: open issues on Check. */
type BadgeTone = "quiet" | "accent" | "warn";

const badgeColors = {
	quiet: { background: "sunken", text: "ink2" },
	accent: { background: "accent", text: "onAccent" },
	warn: { background: "warnSoft", text: "warnText" },
} as const;

type BadgeProps = {
	value: string | number;
	tone: BadgeTone;
};

function TabBadge({ value, tone }: BadgeProps) {
	const { colors, radius, size, space } = useTheme();
	return (
		<View
			style={{
				position: "absolute",
				top: -space.s1,
				// Just past the middle of the icon cell (app.html: left 50% + 6px).
				start: (Platform.OS === "android" ? androidPill.width : size.icon.bar) / 2 + space.s1,
				minWidth: badgeMinWidth,
				paddingHorizontal: space.s1,
				borderRadius: radius.rPill,
				borderWidth: space.s0,
				borderColor: colors.surface,
				backgroundColor: colors[badgeColors[tone].background],
				alignItems: "center",
			}}
		>
			<Text variant="micro" color={badgeColors[tone].text}>
				{value}
			</Text>
		</View>
	);
}

type BarItemProps = {
	label: string;
	/** Omitted for the raised "+" pill. */
	icon?: IconName | undefined;
	focused: boolean;
	onPress: () => void;
	badge?: string | number | undefined;
	badgeTone?: BadgeTone | undefined;
};

/** One cell of a bottom bar: the app tab bar and the editor's Write / Page / Design / Check bar share it. */
export function BarItem({ label, icon, focused, onPress, badge, badgeTone = "accent" }: BarItemProps) {
	const { colors, radius, size, space } = useTheme();
	const android = Platform.OS === "android";

	return (
		<Pressable
			accessibilityRole={icon ? "tab" : "button"}
			accessibilityState={icon ? { selected: focused } : {}}
			accessibilityLabel={badge === undefined ? label : `${label}, ${badge}`}
			onPress={() => {
				if (icon && !focused) haptics.selection();
				onPress();
			}}
			android_ripple={{ color: colors.press, borderless: true }}
			style={({ pressed }) => ({
				flex: 1,
				minHeight: android ? androidTabHeight : size.tabBar,
				alignItems: "center",
				justifyContent: "center",
				gap: space.s0,
				paddingVertical: space.s1,
				backgroundColor: pressed && !android ? colors.press : "transparent",
			})}
		>
			{focused && !android ? (
				<View
					style={{
						position: "absolute",
						top: 0,
						...iosMarker,
						borderBottomStartRadius: iosMarker.height,
						borderBottomEndRadius: iosMarker.height,
						backgroundColor: colors.accent,
					}}
				/>
			) : null}
			{icon ? (
				<View
					style={{
						...(android ? androidPill : null),
						borderRadius: radius.rPill,
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: focused && android ? colors.accentSoft : "transparent",
					}}
				>
					<Icon name={icon} filled={focused} color={focused ? colors.ink : colors.ink2} size={size.icon.bar} />
					{badge === undefined ? null : <TabBadge value={badge} tone={badgeTone} />}
				</View>
			) : (
				<View
					style={{
						...size.newPill,
						borderRadius: radius.rPill,
						backgroundColor: colors.accent,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Icon name="plus" color={colors.onAccent} size={size.icon.row} />
				</View>
			)}
			<Text variant="micro" color={focused ? "ink" : "ink2"} numberOfLines={1}>
				{label}
			</Text>
		</Pressable>
	);
}

type BarProps = {
	children: ReactNode;
};

/** A bottom bar on `surface` with a top rule, padding the bottom and side safe areas. Hidden while the keyboard is up. */
export function Bar({ children }: BarProps) {
	const insets = useSafeAreaInsets();
	const { colors } = useTheme();
	const keyboardVisible = useKeyboardState((keyboard) => keyboard.isVisible);

	if (keyboardVisible) return null;

	return (
		<View
			accessibilityRole="tablist"
			style={{
				flexDirection: "row",
				paddingBottom: insets.bottom,
				paddingStart: insets.left,
				paddingEnd: insets.right,
				backgroundColor: colors.surface,
				borderTopWidth: 1,
				borderTopColor: colors.line,
			}}
		>
			{children}
		</View>
	);
}

/**
 * The phone tab bar (app.html): five cells, the active tab with a filled icon plus an `accent` 28×3 marker on iOS or
 * an `accentSoft` pill on Android, and the raised "+" pill in the middle. Labels stay under the icons at every text
 * size (`micro` caps its scale); the bar grows taller instead of truncating.
 */
export function PhoneTabBar(props: BottomTabBarProps) {
	const { t } = useLingui();
	const onPress = useTabPress(props);

	return (
		<Bar>
			{props.state.routes.map((route, index) => (
				<BarItem
					key={route.key}
					label={route.name === "create" ? t`New` : tabLabel(props, route)}
					icon={appTabIcons[route.name]}
					focused={index === props.state.index}
					badge={tabBadge(props, route)}
					badgeTone={quietBadges.has(route.name) ? "quiet" : "accent"}
					onPress={() => onPress(route)}
				/>
			))}
		</Bar>
	);
}

type SidebarItemProps = {
	icon: IconName;
	label: string;
	active: boolean;
	onPress: () => void;
	badge?: string | number | undefined;
	quiet?: boolean | undefined;
};

function SidebarItem({ icon, label, active, onPress, badge, quiet = true }: SidebarItemProps) {
	const { colors, radius, size, space } = useTheme();

	return (
		<Pressable
			accessibilityRole="tab"
			accessibilityState={{ selected: active }}
			accessibilityLabel={badge === undefined ? label : `${label}, ${badge}`}
			onPress={() => {
				if (!active) haptics.selection();
				onPress();
			}}
			style={({ pressed }) => ({
				flexDirection: "row",
				alignItems: "center",
				gap: space.s3,
				minHeight: size.hit,
				paddingHorizontal: space.s3,
				borderRadius: radius.rLg,
				backgroundColor: active ? colors.selectedFill : pressed ? colors.press : "transparent",
			})}
		>
			<Icon name={icon} filled={active} size={size.icon.toolbar} color={active ? colors.accentText : colors.ink2} />
			<Text variant={active ? "label" : "body"} color={active ? "accentText" : "ink2"} style={{ flex: 1 }}>
				{label}
			</Text>
			{badge === undefined ? null : quiet ? (
				<Text variant="callout" color={active ? "ink2" : "ink3"}>
					{badge}
				</Text>
			) : (
				<View
					style={{
						minWidth: badgeMinWidth,
						paddingHorizontal: space.s1,
						borderRadius: radius.rPill,
						backgroundColor: colors.accent,
						alignItems: "center",
					}}
				>
					<Text variant="micro" color="onAccent">
						{badge}
					</Text>
				</View>
			)}
		</Pressable>
	);
}

/**
 * The tablet sidebar (app.html `side`, 240 pt): brand, Search or run…, the four sections, then Trash, New and the
 * account row at the bottom. Section counts come from each tab's `tabBarBadge` option.
 */
export function AppSidebar(props: BottomTabBarProps) {
	const router = useRouter();
	const { t } = useLingui();
	const { state, insets } = props;
	const pathname = usePathname();
	const { colors, radius, size, space } = useTheme();
	const onPress = useTabPress(props);
	const inTrash = pathname.startsWith(routes.trash());

	return (
		<View
			accessibilityRole="tablist"
			style={{
				width: size.sidebar + insets.left,
				paddingTop: insets.top + space.s3,
				paddingBottom: insets.bottom + space.s3,
				paddingStart: insets.left + space.s3,
				paddingEnd: space.s3,
				gap: space.s0,
				backgroundColor: colors.surface,
				borderEndWidth: 1,
				borderEndColor: colors.line,
			}}
		>
			<Text variant="heading" numberOfLines={1} style={{ paddingHorizontal: space.s3, paddingBottom: space.s3 }}>
				Reactive Resume
			</Text>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={t`Search or run…`}
				onPress={() => router.push(routes.search())}
				style={{
					flexDirection: "row",
					alignItems: "center",
					gap: space.s2,
					minHeight: size.hit,
					paddingHorizontal: space.s3,
					marginBottom: space.s2,
					borderRadius: radius.rLg,
					backgroundColor: colors.sunken,
				}}
			>
				<Icon name="magnifying-glass" size={size.icon.meta} color={colors.ink3} />
				<Text variant="callout" color="ink3" numberOfLines={1} style={{ flex: 1 }}>
					{t`Search or run…`}
				</Text>
				<Text variant="caption" color="ink3">
					⌘K
				</Text>
			</Pressable>
			{state.routes.map((route, index) => {
				const icon = appTabIcons[route.name];
				if (!icon) return null;
				const badge = tabBadge(props, route);
				return (
					<SidebarItem
						key={route.key}
						icon={icon}
						label={tabLabel(props, route)}
						active={index === state.index && !inTrash}
						badge={badge}
						quiet={quietBadges.has(route.name)}
						onPress={() =>
							inTrash && route.name === "documents" ? router.navigate(routes.documents()) : onPress(route)
						}
					/>
				);
			})}
			<View style={{ flex: 1 }} />
			<SidebarItem icon="trash" label={t`Trash`} active={inTrash} onPress={() => router.navigate(routes.trash())} />
			<View style={{ paddingVertical: space.s2 }}>
				<Button icon="plus" label={t`New`} fullWidth onPress={() => router.push(routes.new())} />
			</View>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={t`Account`}
				onPress={() => router.navigate(routes.settings("account"))}
				style={{
					flexDirection: "row",
					alignItems: "center",
					gap: space.s3,
					minHeight: size.row,
					paddingHorizontal: space.s3,
					paddingTop: space.s2,
					borderTopWidth: 1,
					borderTopColor: colors.line,
				}}
			>
				<Icon name="user-circle" size={size.icon.bar} color={colors.ink2} />
				<Text variant="body" color="ink2">
					{t`Account`}
				</Text>
			</Pressable>
		</View>
	);
}
