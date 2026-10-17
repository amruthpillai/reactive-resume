// Reduced motion, haptics and the tablet check shared by the primitives (tokens.md §6).
import * as Haptics from "expo-haptics";
import { useSyncExternalStore } from "react";
import { AccessibilityInfo, useWindowDimensions } from "react-native";
import { size } from "./tokens";

let reduceMotion = false;
const listeners = new Set<() => void>();
const setReduceMotion = (value: boolean) => {
	reduceMotion = value;
	for (const listener of listeners) listener();
};

void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);

/**
 * iOS Reduce Motion or Android "Remove animations". Movement then takes 0 ms and slides become a `d1` cross-fade.
 * Reanimated and the bottom sheet already skip their animations on their own (`ReduceMotion.System`).
 */
export function useReducedMotion(): boolean {
	return useSyncExternalStore(
		(listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		() => reduceMotion,
	);
}

const ignore = () => undefined;

/** tokens.md §6 Haptics. Separate from motion: they play with reduced motion on too. */
export const haptics = {
	/** Segmented change, detent change, lifting a row to reorder. */
	selection: () => void Haptics.selectionAsync().catch(ignore),
	/** Long-press to select. */
	light: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore),
	/** Confirming a destructive action. */
	warning: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(ignore),
	success: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignore),
};

/**
 * Tablet layouts (form sheets, tablet toasts): the short side fits a form sheet. Phones in landscape stay phones,
 * and an iPad in a narrow split view falls back to the phone layout.
 */
export function useIsWide(): boolean {
	const { width, height } = useWindowDimensions();
	return Math.min(width, height) >= size.formSheet;
}
