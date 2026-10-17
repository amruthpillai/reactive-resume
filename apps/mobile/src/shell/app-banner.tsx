import type { IconName } from "@/ui";
import type { ReactNode } from "react";
import { createContext, use, useSyncExternalStore } from "react";
import { View } from "react-native";
import { Icon, Text, useReducedMotion, useTheme } from "@/ui";

const BannerAboveContext = createContext(false);

/** Set by the tab shell while a banner sits above the tabs and has cleared the status bar. */
export const BannerAbove = BannerAboveContext;

/**
 * Screen options for a tab's native stack. The status bar is already cleared under a banner (and under Career's own
 * strip, `cleared`), but Android's edge-to-edge header pads it natively whatever the JS inset says; this turns that off.
 */
export function useTabStackOptions(cleared = false) {
	const { colors, type } = useTheme();
	const reduced = useReducedMotion();
	const disableTopInsetApplication = use(BannerAboveContext) || cleared;
	return {
		animation: reduced ? ("fade" as const) : ("default" as const),
		headerLargeTitle: true,
		headerLargeTitleStyle: { fontFamily: type.largeIOS.fontFamily, color: colors.ink },
		unstable_nativeProps: { headerConfig: { disableTopInsetApplication } },
	};
}

/** Well-known keys; any string works. The tab shell shows every banner that is set, in the order they were first set. */
export type AppBannerKey = "session" | "guest" | (string & {});

let banners: ReadonlyMap<string, ReactNode> = new Map();
const listeners = new Set<() => void>();

/**
 * Shows a banner under the status bar on every tab (session expired, guest), or hides it with `null`. Setting the same
 * key again replaces it in place. Callable from anywhere, including outside React. The offline strip is built in.
 *
 * @example setAppBanner("session", <AppStrip tone="warn" icon="warning" message={t`Your session ended…`} action={…} />)
 */
export function setAppBanner(key: AppBannerKey, banner: ReactNode | null) {
	const next = new Map(banners);
	if (banner === null || banner === undefined) next.delete(key);
	else next.set(key, banner);
	banners = next;
	for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};

/** The banners the tab shell renders. */
export function useAppBanners() {
	return useSyncExternalStore(subscribe, () => banners);
}

type AppStripProps = {
	tone: "info" | "warn";
	message: string;
	icon?: IconName | undefined;
	/** An action at the end, for example "Sign in again". */
	action?: ReactNode;
};

/** The full-width status strip from the mockups (`strip`): offline in the library, offline in the editor. */
export function AppStrip({ tone, message, icon, action }: AppStripProps) {
	const { colors, size, space } = useTheme();
	const text = tone === "info" ? "infoText" : "warnText";

	return (
		<View
			accessibilityRole="alert"
			accessibilityLiveRegion="polite"
			style={{
				flexDirection: "row",
				alignItems: "center",
				gap: space.s2,
				paddingVertical: space.s2,
				paddingHorizontal: space.s4,
				backgroundColor: tone === "info" ? colors.infoSoft : colors.warnSoft,
			}}
		>
			{icon ? <Icon name={icon} size={size.icon.meta} color={colors[text]} /> : null}
			<Text variant="callout" color={text} style={{ flex: 1 }}>
				{message}
			</Text>
			{action}
		</View>
	);
}
