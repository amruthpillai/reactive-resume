import type { ReactNode } from "react";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useLingui } from "@lingui/react/macro";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "./button";
import { Text } from "./text";
import { useTheme } from "./theme";

export type SheetProps = {
	open: boolean;
	onClose: () => void;
	title?: string | undefined;
	/** Heights as fractions of the screen (`0.5`) or `"content"` to fit. Defaults to `["content"]`. */
	detents?: ("content" | number)[] | undefined;
	children?: ReactNode;
	/** Pinned under the scrolling content, for example the sheet's primary button. */
	footer?: ReactNode;
};

/** A bottom sheet (@gorhom/bottom-sheet). Needs `BottomSheetModalProvider` above it (app/_layout.tsx). */
export function Sheet({ open, onClose, title, detents = ["content"], children, footer }: SheetProps) {
	const { colors, radius, space } = useTheme();
	const insets = useSafeAreaInsets();
	const ref = useRef<BottomSheetModal>(null);
	const snapPoints = detents.filter((detent) => detent !== "content").map((detent) => `${detent * 100}%`);

	useEffect(() => {
		if (open) ref.current?.present();
		else ref.current?.dismiss();
	}, [open]);

	return (
		<BottomSheetModal
			ref={ref}
			onDismiss={onClose}
			enableDynamicSizing={detents.includes("content")}
			{...(snapPoints.length > 0 ? { snapPoints } : {})}
			backgroundStyle={{ backgroundColor: colors.raised, borderRadius: radius.r3xl }}
			handleIndicatorStyle={{ backgroundColor: colors.line2 }}
			backdropComponent={(props) => (
				<BottomSheetBackdrop
					{...props}
					appearsOnIndex={0}
					disappearsOnIndex={-1}
					opacity={1}
					style={[props.style, { backgroundColor: colors.scrimSheet }]}
				/>
			)}
		>
			<BottomSheetScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.s4, gap: space.s2 }}>
				{title ? (
					<Text variant="heading" style={{ paddingHorizontal: space.s4 }}>
						{title}
					</Text>
				) : null}
				{children}
				{footer ? <View style={{ paddingHorizontal: space.s4 }}>{footer}</View> : null}
			</BottomSheetScrollView>
		</BottomSheetModal>
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
	const { colors, radius, space } = useTheme();

	return (
		<Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={cancelLabel ?? t`Cancel`}
				onPress={onCancel}
				style={{ flex: 1, justifyContent: "center", padding: space.s6, backgroundColor: colors.scrim }}
			>
				<View
					accessibilityViewIsModal
					style={{ gap: space.s3, padding: space.s5, borderRadius: radius.r2xl, backgroundColor: colors.raised }}
				>
					<Text variant="title">{title}</Text>
					{message ? <Text color="ink2">{message}</Text> : null}
					<View style={{ flexDirection: "row", justifyContent: "flex-end", gap: space.s2 }}>
						<Button variant="ghost" label={cancelLabel ?? t`Cancel`} onPress={onCancel} />
						<Button variant={destructive ? "danger" : "primary"} label={confirmLabel} onPress={onConfirm} />
					</View>
				</View>
			</Pressable>
		</Modal>
	);
}

export type ToastOptions = {
	message: string;
	/** For example Undo. Pressing it dismisses the toast. */
	action?: { label: string; onPress: () => void } | undefined;
	/** Milliseconds on screen. Defaults to 4000; toasts with an action stay 6000. */
	duration?: number | undefined;
};

type ActiveToast = ToastOptions & { id: number };

let toasts: ActiveToast[] = [];
let nextToastId = 1;
const toastListeners = new Set<() => void>();
const emitToasts = (next: ActiveToast[]) => {
	toasts = next;
	for (const listener of toastListeners) listener();
};

export function dismissToast(id: number) {
	emitToasts(toasts.filter((toast) => toast.id !== id));
}

/** Shows a toast above the tab bar and returns its id. */
export function showToast(options: ToastOptions): number {
	const id = nextToastId++;
	emitToasts([...toasts, { ...options, id }]);
	setTimeout(() => dismissToast(id), options.duration ?? (options.action ? 6000 : 4000));
	return id;
}

/** Renders the active toasts. Mounted once, in app/_layout.tsx. */
export function Toaster() {
	const { colors, radius, space } = useTheme();
	const insets = useSafeAreaInsets();
	const active = useSyncExternalStore(
		(listener) => {
			toastListeners.add(listener);
			return () => toastListeners.delete(listener);
		},
		() => toasts,
	);

	return (
		<View
			pointerEvents="box-none"
			style={{ position: "absolute", left: space.s4, right: space.s4, bottom: insets.bottom + 72, gap: space.s2 }}
		>
			{active.map((toast) => (
				<View
					key={toast.id}
					accessibilityLiveRegion="polite"
					style={{
						flexDirection: "row",
						alignItems: "center",
						gap: space.s2,
						paddingHorizontal: space.s4,
						paddingVertical: space.s3,
						borderRadius: radius.rXl,
						backgroundColor: colors.ink,
					}}
				>
					<Text color="bg" style={{ flex: 1 }}>
						{toast.message}
					</Text>
					{toast.action ? (
						<Button
							variant="link"
							label={toast.action.label}
							onPress={() => {
								toast.action?.onPress();
								dismissToast(toast.id);
							}}
						/>
					) : null}
				</View>
			))}
		</View>
	);
}
