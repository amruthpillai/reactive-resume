import type { ColorToken } from "./tokens";
import type { BottomSheetFooterProps } from "@gorhom/bottom-sheet";
import type { ReactNode } from "react";
import { BottomSheetBackdrop, BottomSheetFooter, BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useLingui } from "@lingui/react/macro";
import { createContext, use, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
	AccessibilityInfo,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	useWindowDimensions,
	View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown } from "react-native-reanimated";
import { Button } from "./button";
import { haptics, useIsWide, useReducedMotion } from "./motion";
import { useWindowSafeAreaInsets } from "./safe-area";
import { Text } from "./text";
import { useTheme } from "./theme";

const android = Platform.OS === "android";

/** True inside a bottom sheet: text fields switch to the sheet's keyboard-aware input. */
export const InSheetContext = createContext(false);

export type SheetProps = {
	open: boolean;
	onClose: () => void;
	/** Block incidental dismissal while an explicit save is in flight. */
	dismissible?: boolean | undefined;
	title?: string | undefined;
	/**
	 * Heights as fractions of the screen (`0.5`) or `"content"` to fit. Defaults to `["content"]`. A content-sized
	 * sheet stops at 90% of the screen and scrolls past that.
	 */
	detents?: ("content" | number)[] | undefined;
	children?: ReactNode;
	/** Pinned under the scrolling content, for example the sheet's primary button. */
	footer?: ReactNode;
	/** The start of the header bar, for example a Cancel text button. */
	headerStart?: ReactNode;
	/** The end of the header bar, for example a Save text button. */
	headerEnd?: ReactNode;
	/** Pads the content with `s4`. Defaults to true; full-width rows pass false. */
	padded?: boolean | undefined;
};

type SheetHeaderProps = Pick<SheetProps, "title" | "headerStart" | "headerEnd">;

function SheetHeader({ title, headerStart, headerEnd }: SheetHeaderProps) {
	const { size, space } = useTheme();
	if (!title && !headerStart && !headerEnd) return null;

	// Equal side slots keep the title centred.
	const slot = { flex: 1, flexDirection: "row", alignItems: "center" } as const;

	return (
		<View style={{ flexDirection: "row", alignItems: "center", minHeight: size.topBar, paddingHorizontal: space.s2 }}>
			<View style={slot}>{headerStart}</View>
			{title ? (
				<Text accessibilityRole="header" variant="title" align="center" style={{ flexShrink: 1, maxWidth: "60%" }}>
					{title}
				</Text>
			) : null}
			<View style={[slot, { justifyContent: "flex-end" }]}>{headerEnd}</View>
		</View>
	);
}

/**
 * A bottom sheet on phones (@gorhom/bottom-sheet; needs `BottomSheetModalProvider`, app/_layout.tsx) with the
 * grabber and platform corners, and a centred form sheet on tablets (tokens.md `formSheet`, `r2xl`, no grabber).
 */
export function Sheet(props: SheetProps) {
	const wide = useIsWide();
	return wide ? <FormSheet {...props} /> : <BottomSheet {...props} />;
}

function BottomSheet({
	open,
	onClose,
	title,
	detents = ["content"],
	children,
	footer,
	headerStart,
	headerEnd,
	padded = true,
	dismissible = true,
}: SheetProps) {
	const nested = use(InSheetContext);
	const { colors, radius, shadows, size, space } = useTheme();
	const insets = useWindowSafeAreaInsets();
	const { height } = useWindowDimensions();
	const ref = useRef<BottomSheetModal>(null);
	const detentIndex = useRef(-1);
	const [footerHeight, setFooterHeight] = useState(0);
	const snapPoints = detents.filter((detent) => detent !== "content").map((detent) => `${detent * 100}%`);
	const bottom = insets.bottom + space.s2;
	const bodyStyle = {
		gap: space.s2,
		paddingTop: space.s1,
		paddingHorizontal: padded ? space.s4 : 0,
		paddingBottom: footer ? footerHeight + space.s4 : bottom + space.s2,
	};

	// The parent controls `open`; gorhom finishes each dismissal later through `onDismiss`. `wantsOpen` is what the
	// parent asked for, `presented` whether gorhom shows the sheet, `closing` a dismissal the parent started that has
	// not finished. Only a dismissal the user started (swipe, backdrop, Escape) reports `onClose`. Reopening while a
	// dismissal runs waits for it to finish, so its late callback cannot close the reopened sheet. Dismissing a modal
	// that was never presented leaves gorhom unable to present it later, so only a presented sheet is dismissed.
	const wantsOpen = useRef(false);
	const presented = useRef(false);
	const closing = useRef(false);
	useEffect(() => {
		wantsOpen.current = open;
		if (open) {
			if (closing.current || presented.current) return;
			presented.current = true;
			ref.current?.present();
		} else if (presented.current && !closing.current) {
			closing.current = true;
			ref.current?.dismiss();
		}
	}, [open]);
	const onDismiss = () => {
		presented.current = false;
		if (closing.current) {
			closing.current = false;
			if (!wantsOpen.current) return;
			presented.current = true;
			ref.current?.present();
			return;
		}
		if (wantsOpen.current) {
			if (dismissible) onClose();
			else {
				presented.current = true;
				ref.current?.present();
			}
		}
	};

	const renderFooter = footer
		? (footerProps: BottomSheetFooterProps) => (
				<BottomSheetFooter {...footerProps}>
					<View
						onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
						style={{
							paddingTop: space.s3,
							paddingHorizontal: space.s4,
							paddingBottom: bottom,
							borderTopWidth: StyleSheet.hairlineWidth,
							borderTopColor: colors.line,
							backgroundColor: colors.raised,
						}}
					>
						{footer}
					</View>
				</BottomSheetFooter>
			)
		: undefined;

	return (
		<BottomSheetModal
			ref={ref}
			// Nested setup/picker sheets must keep their parent mounted and presented.
			stackBehavior={nested ? "push" : "switch"}
			// Keep the sheet's controls individually reachable by VoiceOver instead of one adjustable group.
			accessible={false}
			onDismiss={onDismiss}
			enablePanDownToClose={dismissible}
			onChange={(index) => {
				// A detent change after the sheet is up, not the first appearance.
				if (index >= 0 && detentIndex.current >= 0 && index !== detentIndex.current) haptics.selection();
				detentIndex.current = index;
			}}
			enableDynamicSizing={detents.includes("content")}
			// A content-sized sheet stops at 90% of the screen; past that its content scrolls.
			maxDynamicContentSize={Math.round(height * 0.9)}
			{...(snapPoints.length > 0 ? { snapPoints } : {})}
			keyboardBehavior="interactive"
			keyboardBlurBehavior="restore"
			android_keyboardInputMode="adjustResize"
			topInset={insets.top}
			style={{ marginLeft: insets.left, marginRight: insets.right }}
			backgroundStyle={{
				backgroundColor: colors.raised,
				borderTopLeftRadius: android ? radius.rSheetA : radius.r3xl,
				borderTopRightRadius: android ? radius.rSheetA : radius.r3xl,
				boxShadow: shadows.e3.boxShadow,
			}}
			handleComponent={() => (
				<View>
					{/* The 22 pt strip with the grabber, 36×5 on iOS and 32×4 on Android (tokens.md §3.1). */}
					<View
						accessible={false}
						style={{ height: space.s5 + space.s0, alignItems: "center", justifyContent: "center" }}
					>
						<View
							style={{
								width: android ? size.grabber.width - space.s1 : size.grabber.width,
								height: android ? size.grabber.height - 1 : size.grabber.height,
								borderRadius: radius.rPill,
								backgroundColor: colors.line2,
							}}
						/>
					</View>
					<SheetHeader title={title} headerStart={headerStart} headerEnd={headerEnd} />
				</View>
			)}
			backdropComponent={(backdrop) => (
				<BottomSheetBackdrop
					{...backdrop}
					appearsOnIndex={0}
					disappearsOnIndex={-1}
					opacity={1}
					pressBehavior={dismissible ? "close" : "none"}
					style={[backdrop.style, { backgroundColor: colors.scrimSheet }]}
				/>
			)}
			{...(renderFooter ? { footerComponent: renderFooter } : {})}
		>
			<InSheetContext.Provider value>
				<BottomSheetScrollView
					accessibilityViewIsModal
					onAccessibilityEscape={dismissible ? onClose : undefined}
					keyboardShouldPersistTaps="handled"
					contentContainerStyle={bodyStyle}
				>
					{children}
				</BottomSheetScrollView>
			</InSheetContext.Provider>
		</BottomSheetModal>
	);
}

function FormSheet({
	open,
	onClose,
	title,
	children,
	footer,
	headerStart,
	headerEnd,
	padded = true,
	dismissible = true,
}: SheetProps) {
	const { colors, radius, shadows, size, space } = useTheme();
	const { width, height } = useWindowDimensions();

	return (
		<Modal
			visible={open}
			transparent
			animationType="fade"
			onRequestClose={dismissible ? onClose : undefined}
			statusBarTranslucent
			navigationBarTranslucent
			supportedOrientations={["portrait", "landscape"]}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.scrimSheet }}
			>
				<Pressable accessible={false} onPress={dismissible ? onClose : undefined} style={StyleSheet.absoluteFill} />
				<View
					accessibilityViewIsModal
					onAccessibilityEscape={dismissible ? onClose : undefined}
					style={{
						width: Math.min(size.formSheet, width - space.s6 * 2),
						maxHeight: height - space.s12 * 2,
						paddingTop: space.s1 + space.s0,
						borderRadius: radius.r2xl,
						backgroundColor: colors.raised,
						boxShadow: shadows.e3.boxShadow,
						overflow: "hidden",
					}}
				>
					<SheetHeader title={title} headerStart={headerStart} headerEnd={headerEnd} />
					<ScrollView
						keyboardShouldPersistTaps="handled"
						contentContainerStyle={{
							gap: space.s2,
							paddingTop: space.s1,
							paddingBottom: space.s4,
							paddingHorizontal: padded ? space.s4 : 0,
						}}
					>
						{children}
					</ScrollView>
					{footer ? (
						<View
							style={{
								padding: space.s4,
								paddingTop: space.s3,
								borderTopWidth: StyleSheet.hairlineWidth,
								borderTopColor: colors.line,
							}}
						>
							{footer}
						</View>
					) : null}
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}

type EditorSheetProps = Omit<SheetProps, "open" | "dismissible"> & { dirty: boolean; pending: boolean };

/** Keep the form owner mounted while a native dismissal asks whether to discard its edits. */
export function EditorSheet({
	dirty,
	pending,
	onClose,
	children,
	footer,
	detents = [0.9],
	...props
}: EditorSheetProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const [visible, setVisible] = useState(true);
	const [confirm, setConfirm] = useState(false);
	const reopen = () => {
		setConfirm(false);
		setVisible(true);
	};
	const close = () => {
		if (pending) return;
		if (!dirty) return onClose();
		setVisible(false);
		setConfirm(true);
	};
	return (
		<>
			<Sheet
				{...props}
				open={visible || pending}
				onClose={close}
				dismissible={!pending}
				detents={detents}
				footer={
					<View style={{ gap: space.s2 }}>
						{footer}
						<Button label={t`Cancel`} variant="ghost" disabled={pending} onPress={close} />
					</View>
				}
			>
				{children}
			</Sheet>
			<ConfirmDialog
				open={confirm && !pending}
				title={t`Discard changes?`}
				message={t`You have unsaved changes.`}
				confirmLabel={t`Discard`}
				cancelLabel={t`Keep editing`}
				destructive
				onConfirm={() => {
					if (!pending) onClose();
				}}
				onCancel={reopen}
			/>
		</>
	);
}

export type ConfirmDialogProps = {
	open: boolean;
	title: string;
	message?: string | undefined;
	confirmLabel: string;
	/** Defaults to "Cancel". */
	cancelLabel?: string | undefined;
	/** Styles the confirm button as destructive. */
	destructive?: boolean | undefined;
	onConfirm: () => void;
	onCancel: () => void;
};

type DialogActionProps = {
	label: string;
	onPress: () => void;
	color: ColorToken;
	bold?: boolean;
	/** iOS: share the row with the other button. */
	fill?: boolean;
	/** iOS: a hairline before the button; `stacked` puts it above instead of at the start. */
	separator?: "start" | "top" | undefined;
};

function DialogAction({ label, onPress, color, bold, fill, separator }: DialogActionProps) {
	const { colors, radius, size, space } = useTheme();

	return (
		<Pressable
			accessibilityRole="button"
			onPress={onPress}
			android_ripple={{ color: colors.press }}
			style={({ pressed }) =>
				android
					? {
							minHeight: size.hit,
							justifyContent: "center",
							paddingHorizontal: space.s3,
							borderRadius: radius.rPill,
							overflow: "hidden",
						}
					: {
							flex: fill ? 1 : undefined,
							minHeight: size.input,
							justifyContent: "center",
							paddingHorizontal: space.s2,
							backgroundColor: pressed ? colors.press : "transparent",
							borderStartWidth: separator === "start" ? StyleSheet.hairlineWidth : 0,
							borderTopWidth: separator === "top" ? StyleSheet.hairlineWidth : 0,
							borderColor: colors.line,
						}
			}
		>
			<Text variant={android ? "label" : "title"} weight={android || bold ? 600 : 400} color={color} align="center">
				{label}
			</Text>
		</Pressable>
	);
}

// The mockups' alert widths: 290 pt on iOS, 320 pt (Material dialog) on Android.
const alertWidth = android ? 320 : 290;

/** The platform alert: a centred iOS alert, or a Material dialog with text buttons at the end. */
export function ConfirmDialog({
	open,
	title,
	message,
	confirmLabel,
	cancelLabel,
	destructive,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	const { t } = useLingui();
	const { colors, radius, shadows, space } = useTheme();
	const { width, height, fontScale } = useWindowDimensions();
	const cancel = cancelLabel ?? t`Cancel`;
	const confirmColor: ColorToken = destructive ? "dangerText" : "accentText";
	// Long labels or large text stack the iOS buttons instead of squeezing them side by side.
	const stacked = !android && (fontScale > 1.3 || cancel.length + confirmLabel.length > 24);
	const confirm = () => {
		if (destructive) haptics.warning();
		onConfirm();
	};

	return (
		<Modal
			visible={open}
			transparent
			animationType="fade"
			onRequestClose={onCancel}
			statusBarTranslucent
			navigationBarTranslucent
			supportedOrientations={["portrait", "landscape"]}
		>
			<View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.scrim }}>
				{/* Material dialogs close on an outside tap; iOS alerts do not. */}
				{android ? <Pressable accessible={false} onPress={onCancel} style={StyleSheet.absoluteFill} /> : null}
				<View
					accessibilityViewIsModal
					accessibilityRole="alert"
					onAccessibilityEscape={onCancel}
					style={{
						width: Math.min(alertWidth, width - space.s10 * 2),
						maxHeight: height - space.s12 * 2,
						borderRadius: android ? radius.rSheetA : radius.r2xl,
						backgroundColor: colors.raised,
						boxShadow: shadows.e3.boxShadow,
						overflow: "hidden",
					}}
				>
					{/* The text scrolls when large type makes it taller than the screen; the buttons stay visible. */}
					<ScrollView
						style={{ flexGrow: 0, flexShrink: 1 }}
						contentContainerStyle={
							android
								? { gap: space.s3, paddingTop: space.s6, paddingHorizontal: space.s6, paddingBottom: space.s3 }
								: { gap: space.s1 + space.s0, padding: space.s4, paddingTop: space.s5 }
						}
					>
						<Text
							accessibilityRole="header"
							variant={android ? "heading" : "title"}
							align={android ? "auto" : "center"}
						>
							{title}
						</Text>
						{message ? (
							<Text variant={android ? "body" : "callout"} color="ink2" align={android ? "auto" : "center"}>
								{message}
							</Text>
						) : null}
					</ScrollView>
					{android ? (
						<View
							style={{
								flexDirection: "row",
								justifyContent: "flex-end",
								flexWrap: "wrap",
								gap: space.s1,
								paddingHorizontal: space.s4,
								paddingBottom: space.s4,
							}}
						>
							<DialogAction label={cancel} onPress={onCancel} color="accentText" />
							<DialogAction label={confirmLabel} onPress={confirm} color={confirmColor} />
						</View>
					) : (
						<View
							style={{
								flexDirection: stacked ? "column" : "row",
								borderTopWidth: StyleSheet.hairlineWidth,
								borderTopColor: colors.line,
							}}
						>
							{stacked ? (
								<>
									<DialogAction label={confirmLabel} onPress={confirm} color={confirmColor} bold />
									<DialogAction label={cancel} onPress={onCancel} color="accentText" separator="top" />
								</>
							) : (
								<>
									<DialogAction label={cancel} onPress={onCancel} color="accentText" fill />
									<DialogAction
										label={confirmLabel}
										onPress={confirm}
										color={confirmColor}
										bold
										fill
										separator="start"
									/>
								</>
							)}
						</View>
					)}
				</View>
			</View>
		</Modal>
	);
}

export type ToastOptions = {
	message: string;
	/** For example Undo. Pressing it dismisses the toast. */
	action?: { label: string; onPress: () => void } | undefined;
	/** Shorthand for an "Undo" action. */
	undo?: (() => void) | undefined;
	/** Milliseconds on screen. Defaults to 4000; toasts with an action stay 6000. Doubled for screen readers. */
	duration?: number | undefined;
};

type ActiveToast = ToastOptions & { id: number };

let toasts: ActiveToast[] = [];
let nextToastId = 1;
const toastTimers = new Map<number, ReturnType<typeof setTimeout>>();
const clearToastTimer = (id: number) => {
	clearTimeout(toastTimers.get(id));
	toastTimers.delete(id);
};
const toastListeners = new Set<() => void>();
const emitToasts = (next: ActiveToast[]) => {
	toasts = next;
	for (const listener of toastListeners) listener();
};

let screenReader = false;
void AccessibilityInfo.isScreenReaderEnabled().then((value) => (screenReader = value));
AccessibilityInfo.addEventListener("screenReaderChanged", (value) => (screenReader = value));

/** How long a toast with this requested duration actually stays: screen readers get twice as long. */
export const toastLifetime = (ms: number) => ms * (screenReader ? 2 : 1);

export function dismissToast(id: number) {
	clearToastTimer(id);
	emitToasts(toasts.filter((toast) => toast.id !== id));
}

/**
 * Shows a toast above the tab bar and returns its id. One toast shows at a time; a new one replaces the current.
 * `toast({ message: t\`Moved to trash\`, undo: restore })`.
 */
export function showToast(options: ToastOptions): number {
	const id = nextToastId++;
	const hasAction = !!options.action || !!options.undo;
	// The new toast replaces the current one, and its timer with it.
	for (const toast of toasts) clearToastTimer(toast.id);
	emitToasts([{ ...options, id }]);
	AccessibilityInfo.announceForAccessibility(options.message);
	const duration = toastLifetime(options.duration ?? (hasAction ? 6000 : 4000));
	toastTimers.set(
		id,
		setTimeout(() => dismissToast(id), duration),
	);
	return id;
}

/** The imperative toast API (alias of `showToast`). */
export const toast = showToast;

/** Renders the active toast. Mounted once, in app/_layout.tsx. */
export function Toaster() {
	const { t } = useLingui();
	const { colors, motion, radius, shadows, size, space } = useTheme();
	const insets = useWindowSafeAreaInsets();
	const wide = useIsWide();
	const reduced = useReducedMotion();
	const active = useSyncExternalStore(
		(listener) => {
			toastListeners.add(listener);
			return () => toastListeners.delete(listener);
		},
		() => toasts,
	);

	// Without a host nothing shows the toasts, so they and their timers go with it.
	useEffect(
		() => () => {
			for (const toast of toasts) clearToastTimer(toast.id);
			toasts = [];
		},
		[],
	);

	return (
		<View
			pointerEvents="box-none"
			style={{
				position: "absolute",
				start: space.s2,
				end: space.s2,
				bottom: insets.bottom + (wide ? space.s8 : size.tabBar + space.s3),
				alignItems: android ? "stretch" : "center",
			}}
		>
			{active.map((item) => {
				const action = item.action ?? (item.undo ? { label: t`Undo`, onPress: item.undo } : undefined);
				return (
					<Animated.View
						key={item.id}
						entering={reduced ? FadeIn.duration(motion.d1) : FadeInDown.duration(motion.d2)}
						exiting={reduced ? FadeOut.duration(motion.d1) : FadeOutDown.duration(motion.d2)}
						accessibilityLiveRegion="polite"
						style={{
							flexDirection: "row",
							alignItems: "center",
							gap: space.s1 + space.s0,
							minHeight: size.button,
							maxWidth: size.formSheet,
							paddingStart: space.s4,
							paddingEnd: action ? space.s1 + space.s0 : space.s4,
							borderRadius: android ? radius.rSm : radius.r2xl,
							backgroundColor: colors.ink,
							boxShadow: (wide ? shadows.e2 : shadows.e3).boxShadow,
						}}
					>
						<Text color="bg" style={{ flexShrink: 1, flexGrow: android ? 1 : 0, paddingVertical: space.s3 }}>
							{item.message}
						</Text>
						{action ? (
							<Pressable
								accessibilityRole="button"
								onPress={() => {
									action.onPress();
									dismissToast(item.id);
								}}
								style={({ pressed }) => ({
									minHeight: size.hit,
									justifyContent: "center",
									paddingHorizontal: space.s2 + space.s0,
									opacity: pressed ? 0.6 : 1,
								})}
							>
								<Text weight={700} color="accentSoft">
									{action.label}
								</Text>
							</Pressable>
						) : null}
					</Animated.View>
				);
			})}
		</View>
	);
}
