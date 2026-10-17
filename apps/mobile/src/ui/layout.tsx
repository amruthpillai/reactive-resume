import type { IconName } from "./icon";
import type { ReactNode } from "react";
import type { DimensionValue, StyleProp, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { Pressable, View } from "react-native";
import { Button } from "./button";
import { Icon } from "./icon";
import { Text } from "./text";
import { useTheme } from "./theme";

export type ListRowProps = {
	title: string;
	subtitle?: string | undefined;
	/** An icon name, or any element (avatar, checkbox, thumbnail). */
	leading?: IconName | ReactNode;
	/** A value, switch or badge at the end. */
	trailing?: ReactNode;
	onPress?: (() => void) | undefined;
	onLongPress?: (() => void) | undefined;
	/** Shows a caret: the row opens another screen. */
	chevron?: boolean | undefined;
	destructive?: boolean | undefined;
	selected?: boolean | undefined;
	disabled?: boolean | undefined;
	accessibilityHint?: string | undefined;
};

export function ListRow({
	title,
	subtitle,
	leading,
	trailing,
	onPress,
	onLongPress,
	chevron,
	destructive,
	selected,
	disabled,
	accessibilityHint,
}: ListRowProps) {
	const { colors, size, space } = useTheme();

	return (
		<Pressable
			accessibilityRole={onPress ? "button" : undefined}
			accessibilityState={{ disabled: !!disabled, selected: !!selected }}
			accessibilityHint={accessibilityHint}
			disabled={disabled || !onPress}
			onPress={onPress}
			onLongPress={onLongPress}
			style={({ pressed }) => ({
				minHeight: subtitle ? 64 : size.row,
				flexDirection: "row",
				alignItems: "center",
				gap: space.s3,
				paddingHorizontal: space.s4,
				backgroundColor: pressed ? colors.press : selected ? colors.selectedFill : "transparent",
				opacity: disabled ? 0.5 : 1,
			})}
		>
			{typeof leading === "string" ? (
				<Icon name={leading as IconName} size={size.icon.row} color={destructive ? colors.dangerText : colors.ink2} />
			) : (
				leading
			)}
			<View style={{ flex: 1 }}>
				<Text variant="bodyLarge" color={destructive ? "dangerText" : "ink"}>
					{title}
				</Text>
				{subtitle ? (
					<Text variant="callout" color="ink3">
						{subtitle}
					</Text>
				) : null}
			</View>
			{trailing}
			{chevron ? <Icon name="caret-right" size={size.icon.row} color={colors.ink3} /> : null}
		</Pressable>
	);
}

export type CardProps = {
	children?: ReactNode;
	onPress?: (() => void) | undefined;
	onLongPress?: (() => void) | undefined;
	selected?: boolean | undefined;
	/** The accessible name when the card is pressable. */
	accessibilityLabel?: string | undefined;
	style?: StyleProp<ViewStyle>;
};

export function Card({ children, onPress, onLongPress, selected, accessibilityLabel, style }: CardProps) {
	const { colors, radius, shadows, space } = useTheme();
	const cardStyle = [
		{
			padding: space.s3,
			borderRadius: radius.rXl,
			borderWidth: 1,
			borderColor: selected ? colors.accent : colors.line,
			backgroundColor: selected ? colors.selectedFill : colors.surface,
			boxShadow: shadows.e1.boxShadow,
		},
		style,
	];

	// A card that is not pressable stays a plain container, so the controls inside it remain separate
	// accessibility elements.
	if (!onPress && !onLongPress) return <View style={cardStyle}>{children}</View>;

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ selected: !!selected }}
			onPress={onPress}
			onLongPress={onLongPress}
			style={cardStyle}
		>
			{children}
		</Pressable>
	);
}

export type EmptyStateProps = {
	icon?: IconName | undefined;
	title: string;
	message?: string | undefined;
	action?: { label: string; onPress: () => void } | undefined;
};

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
	const { colors, space } = useTheme();

	return (
		<View style={{ alignItems: "center", gap: space.s3, paddingVertical: space.s8, paddingHorizontal: space.s6 }}>
			{icon ? <Icon name={icon} size={32} color={colors.ink3} /> : null}
			<Text variant="heading" align="center">
				{title}
			</Text>
			{message ? (
				<Text color="ink2" align="center">
					{message}
				</Text>
			) : null}
			{action ? <Button label={action.label} onPress={action.onPress} /> : null}
		</View>
	);
}

export type BannerTone = "info" | "warn" | "danger";

export type BannerProps = {
	/** `info`: offline and neutral guidance. `warn`: guest, session expired, locked. `danger`: errors. */
	tone: BannerTone;
	message: string;
	title?: string | undefined;
	icon?: IconName | undefined;
	action?: { label: string; onPress: () => void } | undefined;
	onDismiss?: (() => void) | undefined;
};

const bannerColors = {
	info: { background: "infoSoft", text: "infoText" },
	warn: { background: "warnSoft", text: "warnText" },
	danger: { background: "dangerSoft", text: "dangerText" },
} as const;

export function Banner({ tone, message, title, icon, action }: BannerProps) {
	const { colors, radius, space } = useTheme();
	const palette = bannerColors[tone];

	return (
		<View
			accessibilityRole="alert"
			style={{
				flexDirection: "row",
				alignItems: "center",
				gap: space.s2,
				padding: space.s3,
				borderRadius: radius.rXl,
				backgroundColor: colors[palette.background],
			}}
		>
			{icon ? <Icon name={icon} color={colors[palette.text]} /> : null}
			<View style={{ flex: 1 }}>
				{title ? (
					<Text variant="label" color={palette.text}>
						{title}
					</Text>
				) : null}
				<Text variant="callout" color={palette.text}>
					{message}
				</Text>
			</View>
			{action ? <Button variant="link" label={action.label} onPress={action.onPress} /> : null}
		</View>
	);
}

export type AvatarProps = {
	name: string;
	uri?: string | null | undefined;
	/** Diameter in pt. Defaults to 40. */
	size?: number | undefined;
};

export function Avatar({ name, uri, size = 40 }: AvatarProps) {
	const { colors } = useTheme();
	const initials = name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
	const circle = { width: size, height: size, borderRadius: size / 2 };

	if (uri) return <Image source={{ uri }} style={circle} accessibilityLabel={name} />;

	return (
		<View
			accessibilityLabel={name}
			style={[circle, { alignItems: "center", justifyContent: "center", backgroundColor: colors.accentSoft }]}
		>
			<Text variant="label" color="accentText">
				{initials}
			</Text>
		</View>
	);
}

export type SkeletonProps = {
	width?: DimensionValue | undefined;
	height: number;
	radius?: number | undefined;
};

/** A loading placeholder in `sunken`. The shimmer stops with reduced motion (M2-T1). */
export function Skeleton({ width = "100%", height, radius }: SkeletonProps) {
	const { colors, radius: radii } = useTheme();

	return <View style={{ width, height, borderRadius: radius ?? radii.rMd, backgroundColor: colors.sunken }} />;
}
