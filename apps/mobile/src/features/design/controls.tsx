import type { ReactNode } from "react";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { I18nManager, TextInput, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { IconButton, Switch, Text, useTheme } from "@/ui";

type FieldProps = { label: string; value?: string | undefined; helper?: string | undefined; children: ReactNode };

/** A labelled control: label (and its current value) above, helper text below. */
export function Field({ label, value, helper, children }: FieldProps) {
	const { fonts, space } = useTheme();
	return (
		<View style={{ gap: space.s2 }}>
			<View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
				<Text variant="callout" style={{ fontFamily: fonts.ui[600] }}>
					{label}
				</Text>
				{value ? (
					<Text variant="mono" color="ink2">
						{value}
					</Text>
				) : null}
			</View>
			{children}
			{helper ? (
				<Text variant="caption" color="ink3">
					{helper}
				</Text>
			) : null}
		</View>
	);
}

const snap = (value: number, min: number, max: number, step: number) =>
	Math.min(max, Math.max(min, Math.round((value - min) / step) * step + min));

type SliderProps = {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	/** Spoken with the value, for example "10 pt". */
	format: (value: number) => string;
	onChange: (value: number) => void;
	disabled?: boolean | undefined;
};

/**
 * A horizontal slider. Each move calls `onChange`; callers coalesce the drag into one undo step. Screen readers
 * adjust it by one step with swipe up/down.
 */
export function Slider({ label, value, min, max, step, format, onChange, disabled }: SliderProps) {
	const { colors, radius, size, space, shadows } = useTheme();
	const [width, setWidth] = useState(0);
	const clamped = Math.min(max, Math.max(min, value));
	const fraction = (clamped - min) / (max - min);
	const thumb = space.s6;
	const at = (x: number) => {
		if (width <= 0) return;
		const ratio = (I18nManager.isRTL ? width - x : x) / width;
		const next = snap(min + ratio * (max - min), min, max, step);
		if (next !== clamped) onChange(next);
	};
	const pan = Gesture.Pan()
		.enabled(!disabled)
		.runOnJS(true)
		.activeOffsetX([-4, 4])
		.failOffsetY([-12, 12])
		.onBegin((event) => at(event.x))
		.onUpdate((event) => at(event.x));
	const tap = Gesture.Tap()
		.enabled(!disabled)
		.runOnJS(true)
		.onEnd((event) => at(event.x));

	return (
		<GestureDetector gesture={Gesture.Race(pan, tap)}>
			<View
				accessible
				accessibilityRole="adjustable"
				accessibilityLabel={label}
				accessibilityValue={{ text: format(clamped) }}
				accessibilityState={{ disabled: !!disabled }}
				accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
				onAccessibilityAction={(event) => {
					const next = snap(clamped + (event.nativeEvent.actionName === "increment" ? step : -step), min, max, step);
					if (next !== clamped) onChange(next);
				}}
				onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
				style={{ height: size.hit, justifyContent: "center", opacity: disabled ? 0.45 : 1 }}
			>
				<View style={{ height: space.s1, borderRadius: radius.rPill, backgroundColor: colors.line }}>
					<View
						style={{
							width: `${fraction * 100}%`,
							height: space.s1,
							borderRadius: radius.rPill,
							backgroundColor: colors.accent,
						}}
					/>
				</View>
				<View
					pointerEvents="none"
					style={{
						position: "absolute",
						start: fraction * Math.max(0, width - thumb),
						width: thumb,
						height: thumb,
						borderRadius: thumb / 2,
						backgroundColor: colors.raised,
						borderWidth: 1,
						borderColor: colors.line2,
						boxShadow: shadows.e1.boxShadow,
					}}
				/>
			</View>
		</GestureDetector>
	);
}

type StepperProps = {
	label: string;
	value: number;
	unit: string;
	min: number;
	max?: number | undefined;
	step: number;
	onChange: (value: number) => void;
	disabled?: boolean | undefined;
};

const decimals = (step: number) => (String(step).split(".")[1] ?? "").length;

/** − value + with the value typeable (mockup "tap the value to type"). Out-of-range typing is clamped on commit. */
export function Stepper({
	label,
	value,
	unit,
	min,
	max = Number.POSITIVE_INFINITY,
	step,
	onChange,
	disabled,
}: StepperProps) {
	const { t } = useLingui();
	const { colors, radius, space, size, type } = useTheme();
	const [typed, setTyped] = useState<string | null>(null);
	const round = (next: number) => Number(Math.min(max, Math.max(min, next)).toFixed(decimals(step)));
	const commit = () => {
		const parsed = Number.parseFloat((typed ?? "").replace(",", "."));
		setTyped(null);
		if (Number.isFinite(parsed) && round(parsed) !== value) onChange(round(parsed));
	};
	return (
		<View style={{ flexDirection: "row", alignItems: "center", minHeight: size.hit, gap: space.s2 }}>
			<Text variant="body" style={{ flex: 1 }}>
				{label}
			</Text>
			<IconButton
				icon="minus"
				label={t`Decrease ${label}`}
				disabled={disabled || value <= min}
				onPress={() => onChange(round(value - step))}
			/>
			<TextInput
				accessibilityLabel={label}
				editable={!disabled}
				keyboardType="decimal-pad"
				selectTextOnFocus
				value={typed ?? String(value)}
				onChangeText={setTyped}
				onBlur={commit}
				onSubmitEditing={commit}
				style={{
					...type.mono,
					minWidth: size.hit + space.s4,
					minHeight: size.hit - space.s1,
					textAlign: "center",
					color: colors.ink,
					backgroundColor: colors.raised,
					borderColor: colors.line2,
					borderWidth: 1,
					borderRadius: radius.rMd,
				}}
			/>
			<Text variant="caption" color="ink3">
				{unit}
			</Text>
			<IconButton
				icon="plus"
				label={t`Increase ${label}`}
				disabled={disabled || value >= max}
				onPress={() => onChange(round(value + step))}
			/>
		</View>
	);
}

type SwitchRowProps = {
	label: string;
	description?: string | undefined;
	value: boolean;
	onChange: (value: boolean) => void;
	disabled?: boolean | undefined;
};

export function SwitchRow({ label, description, value, onChange, disabled }: SwitchRowProps) {
	const { space, size } = useTheme();
	return (
		<View style={{ flexDirection: "row", alignItems: "center", gap: space.s3, minHeight: size.hit }}>
			<View style={{ flex: 1, gap: space.s0 }}>
				<Text variant="body">{label}</Text>
				{description ? (
					<Text variant="caption" color="ink3">
						{description}
					</Text>
				) : null}
			</View>
			<Switch label={label} value={value} onValueChange={onChange} disabled={disabled} />
		</View>
	);
}
