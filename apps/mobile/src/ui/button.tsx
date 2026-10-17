import type { IconName } from "./icon";
import type { ColorToken } from "./tokens";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Icon } from "./icon";
import { Text } from "./text";
import { useTheme } from "./theme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";

export type ButtonProps = {
	label: string;
	onPress: () => void;
	/** Same names as the web Button. Defaults to `primary`. */
	variant?: ButtonVariant | undefined;
	/** `default` is 44 pt tall, `lg` is the 48 pt full-width form button, `sm` is a compact inline button. */
	size?: "default" | "sm" | "lg" | undefined;
	icon?: IconName | undefined;
	disabled?: boolean | undefined;
	/** Shows a spinner and blocks presses while an action runs. */
	loading?: boolean | undefined;
	fullWidth?: boolean | undefined;
	accessibilityHint?: string | undefined;
	testID?: string | undefined;
};

const foregrounds = {
	primary: "onAccent",
	danger: "onAccent",
	secondary: "ink",
	ghost: "ink",
	link: "accentText",
} as const satisfies Record<ButtonVariant, ColorToken>;

export function Button({
	label,
	onPress,
	variant = "primary",
	size = "default",
	icon,
	disabled,
	loading,
	fullWidth,
	accessibilityHint,
	testID,
}: ButtonProps) {
	const { colors, radius, size: sizes, space } = useTheme();
	const inactive = disabled || loading;
	const filled = variant === "primary" || variant === "danger";
	const background = {
		primary: colors.accent,
		danger: colors.danger,
		secondary: colors.surface,
		ghost: "transparent",
		link: "transparent",
	}[variant];
	const foreground = inactive ? "ink3" : foregrounds[variant];

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityHint={accessibilityHint}
			accessibilityState={{ disabled: !!inactive, busy: !!loading }}
			disabled={inactive}
			onPress={onPress}
			testID={testID}
			style={({ pressed }) => ({
				minHeight: size === "lg" ? sizes.button : size === "sm" ? 32 : sizes.hit,
				paddingHorizontal: variant === "link" ? 0 : space.s4,
				borderRadius: size === "lg" ? radius.rLg : radius.rMd,
				borderWidth: variant === "secondary" ? 1 : 0,
				borderColor: colors.line2,
				backgroundColor: inactive && filled ? colors.sunken : background,
				alignSelf: fullWidth ? "stretch" : "flex-start",
				alignItems: "center",
				justifyContent: "center",
				opacity: pressed ? 0.85 : 1,
			})}
		>
			<View style={{ flexDirection: "row", alignItems: "center", gap: space.s2 }}>
				{loading ? <ActivityIndicator color={colors[foreground]} /> : null}
				{icon && !loading ? <Icon name={icon} size={sizes.icon.row} color={colors[foreground]} /> : null}
				<Text variant="label" color={foreground}>
					{label}
				</Text>
			</View>
		</Pressable>
	);
}

export type IconButtonProps = {
	icon: IconName;
	/** The accessible name; icons are decorative. */
	label: string;
	onPress: () => void;
	variant?: "ghost" | "secondary" | "primary" | undefined;
	/** Glyph size. Defaults to 22 (toolbars). The hit area is always at least 44 pt. */
	size?: number | undefined;
	selected?: boolean | undefined;
	disabled?: boolean | undefined;
	testID?: string | undefined;
};

export function IconButton({
	icon,
	label,
	onPress,
	variant = "ghost",
	size,
	selected,
	disabled,
	testID,
}: IconButtonProps) {
	const { colors, radius, size: sizes } = useTheme();

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled: !!disabled, selected: !!selected }}
			disabled={disabled}
			onPress={onPress}
			testID={testID}
			style={({ pressed }) => ({
				width: sizes.hit,
				height: sizes.hit,
				borderRadius: radius.rMd,
				alignItems: "center",
				justifyContent: "center",
				borderWidth: variant === "secondary" ? 1 : 0,
				borderColor: colors.line2,
				backgroundColor: variant === "primary" ? colors.accent : selected ? colors.selectedFill : "transparent",
				opacity: pressed ? 0.7 : 1,
			})}
		>
			<Icon
				name={icon}
				size={size ?? sizes.icon.toolbar}
				color={disabled ? colors.ink3 : variant === "primary" ? colors.onAccent : colors.ink}
			/>
		</Pressable>
	);
}
