import type { ColorToken, type as typeScale } from "./tokens";
import type { ReactNode } from "react";
import type { TextProps as NativeTextProps, StyleProp, ViewStyle } from "react-native";
import { ScrollView, Text as NativeText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "./theme";

export type TextVariant = keyof typeof typeScale;

/** Layout styles (`flex`, padding) may go in `style`; typography and colour come from the tokens. */
export type TextProps = NativeTextProps & {
	/** A type token from tokens.md §2. Defaults to `body`. */
	variant?: TextVariant | undefined;
	/** A colour token. Defaults to `ink`. */
	color?: ColorToken | undefined;
	align?: "auto" | "left" | "center" | "right" | undefined;
	children?: ReactNode;
};

export function Text({ variant = "body", color = "ink", align, style, ...props }: TextProps) {
	const { colors, type } = useTheme();
	const { maxFontSizeMultiplier, ...font } = type[variant] as (typeof type)[TextVariant] & {
		maxFontSizeMultiplier?: number;
	};

	return (
		<NativeText
			maxFontSizeMultiplier={maxFontSizeMultiplier}
			{...props}
			style={[font, { color: colors[color] }, align ? { textAlign: align } : null, style]}
		/>
	);
}

export type ScreenProps = {
	children?: ReactNode;
	/** Scrolls its content. Defaults to true; lists that scroll themselves pass false. */
	scroll?: boolean | undefined;
	/** Safe-area edges to pad. Screens under a header or tab bar pad none; those handle their own insets. */
	edges?: ("top" | "bottom" | "left" | "right")[] | undefined;
	contentStyle?: StyleProp<ViewStyle>;
};

/** A screen on the `bg` desk with phone side padding (`s4`). */
export function Screen({ children, scroll = true, edges = [], contentStyle }: ScreenProps) {
	const { colors, space } = useTheme();
	const padding = [{ padding: space.s4, gap: space.s4 }, contentStyle];

	return (
		<SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>
			{scroll ? (
				<ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={padding}>
					{children}
				</ScrollView>
			) : (
				<View style={[{ flex: 1 }, padding]}>{children}</View>
			)}
		</SafeAreaView>
	);
}
