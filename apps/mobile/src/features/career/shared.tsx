import type { SwitchProps } from "@/ui";
import type { ReactNode } from "react";
import { useLingui } from "@lingui/react/macro";
import { Pressable, View } from "react-native";
import { Banner, Button, Skeleton, Switch, Text, useTheme } from "@/ui";

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
	const { t } = useLingui();
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

export { EditorSheet } from "@/ui";
