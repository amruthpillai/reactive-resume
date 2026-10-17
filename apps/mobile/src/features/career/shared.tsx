import type { SwitchProps } from "@/ui";
import type { ReactNode } from "react";
import { t } from "@lingui/core/macro";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Banner, Button, ConfirmDialog, Sheet, Skeleton, Switch, Text, useTheme } from "@/ui";

type SectionProps = { title: string; children: ReactNode };
export function Section({ title, children }: SectionProps) {
	const { space } = useTheme();
	return (
		<View style={{ gap: space.s3 }}>
			<Text variant="title" accessibilityRole="header">
				{title}
			</Text>
			{children}
		</View>
	);
}
type LoadStateProps = { query: { isError: boolean; isPending: boolean; refetch: () => unknown } };
export function LoadState({ query }: LoadStateProps) {
	const { space } = useTheme();
	if (query.isError)
		return (
			<>
				<Banner tone="danger" message={t`Couldn't load this. Check your connection and try again.`} />
				<Button
					variant="secondary"
					label={t`Retry`}
					onPress={() => {
						void query.refetch();
					}}
				/>
			</>
		);
	return query.isPending ? <Skeleton height={space.s12 * 2} /> : null;
}
type ActionsProps = { children: ReactNode };
export function Actions({ children }: ActionsProps) {
	const { space } = useTheme();
	return (
		<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.s2 }}>{children}</View>
	);
}

export function SwitchRow(props: SwitchProps) {
	const { colors, size, space } = useTheme();
	return (
		<Pressable
			accessibilityRole="switch"
			accessibilityLabel={props.label}
			accessibilityState={{ checked: props.value, disabled: !!props.disabled }}
			disabled={props.disabled}
			onPress={() => props.onValueChange(!props.value)}
			style={({ pressed }) => ({
				minHeight: size.hit,
				flexDirection: "row",
				alignItems: "center",
				gap: space.s3,
				backgroundColor: pressed ? colors.press : undefined,
			})}
		>
			<Text style={{ flex: 1 }}>{props.label}</Text>
			<View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
				<Switch {...props} />
			</View>
		</Pressable>
	);
}

type EditorSheetProps = { title: string; dirty: boolean; pending: boolean; onClose: () => void; children: ReactNode };
/** Keep form state mounted while native dismissal asks whether to discard it. */
export function EditorSheet({ title, dirty, pending, onClose, children }: EditorSheetProps) {
	const [visible, setVisible] = useState(true);
	const [confirm, setConfirm] = useState(false);
	const reopen = () => {
		setConfirm(false);
		setVisible(true);
	};
	const close = () => {
		if (!dirty && !pending) return onClose();
		setVisible(false);
		setConfirm(true);
	};
	return (
		<>
			<Sheet
				open={visible}
				onClose={close}
				title={title}
				detents={[0.9]}
				footer={<Button label={t`Cancel`} variant="ghost" onPress={close} />}
			>
				{children}
			</Sheet>
			<ConfirmDialog
				open={confirm}
				title={pending ? t`Saving…` : t`Discard changes?`}
				message={
					pending
						? t`This save may still finish. Wait for it before making another change.`
						: t`You have unsaved changes.`
				}
				confirmLabel={pending ? t`Keep editing` : t`Discard`}
				cancelLabel={t`Keep editing`}
				onConfirm={pending ? reopen : onClose}
				onCancel={reopen}
			/>
		</>
	);
}
