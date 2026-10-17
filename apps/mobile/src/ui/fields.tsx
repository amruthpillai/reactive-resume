import type { IconName } from "./icon";
import type { ReactNode } from "react";
import type { TextInputProps } from "react-native";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { Switch as NativeSwitch, Pressable, TextInput, View } from "react-native";
import { ListRow } from "./layout";
import { Sheet } from "./overlays";
import { Text } from "./text";
import { useTheme } from "./theme";

export type TextFieldProps = Omit<TextInputProps, "style" | "value" | "onChangeText" | "placeholderTextColor"> & {
	label: string;
	value: string;
	onChangeText: (value: string) => void;
	/** Helper text under the field. Replaced by `error` when there is one. */
	helper?: string | undefined;
	error?: string | undefined;
	/** Shown at the end of the field, for example a reveal toggle or a unit. */
	trailing?: ReactNode;
};

type FieldProps = {
	label: string;
	helper?: string | undefined;
	error?: string | undefined;
	children: ReactNode;
};

function Field({ label, helper, error, children }: FieldProps) {
	const { space } = useTheme();

	return (
		<View style={{ gap: space.s1 }}>
			<Text variant="callout" color="ink2">
				{label}
			</Text>
			{children}
			{error || helper ? (
				<Text variant="callout" color={error ? "dangerText" : "ink3"}>
					{error ?? helper}
				</Text>
			) : null}
		</View>
	);
}

function useInputStyle(error: boolean) {
	const { colors, radius, size, space, type } = useTheme();
	return {
		...type.bodyLarge,
		color: colors.ink,
		backgroundColor: colors.raised,
		borderColor: error ? colors.danger : colors.lineStrong,
		borderWidth: 1,
		borderRadius: radius.rLg,
		minHeight: size.input,
		paddingHorizontal: space.s3,
	};
}

export function TextField({ label, helper, error, trailing, ...input }: TextFieldProps) {
	const { colors, space } = useTheme();
	const style = useInputStyle(!!error);

	return (
		<Field label={label} helper={helper} error={error}>
			<View style={{ flexDirection: "row", alignItems: "center", gap: space.s2 }}>
				<TextInput
					accessibilityLabel={label}
					placeholderTextColor={colors.ink3}
					{...input}
					style={[style, { flex: 1 }]}
				/>
				{trailing}
			</View>
		</Field>
	);
}

export type TextAreaProps = Omit<TextFieldProps, "multiline" | "trailing"> & {
	/** Visible lines before the field scrolls. Defaults to 4. */
	minLines?: number | undefined;
};

export function TextArea({ label, helper, error, minLines = 4, ...input }: TextAreaProps) {
	const { colors, space, type } = useTheme();
	const style = useInputStyle(!!error);

	return (
		<Field label={label} helper={helper} error={error}>
			<TextInput
				accessibilityLabel={label}
				placeholderTextColor={colors.ink3}
				multiline
				textAlignVertical="top"
				{...input}
				style={[style, { minHeight: type.bodyLarge.lineHeight * minLines + space.s3 * 2, paddingVertical: space.s3 }]}
			/>
		</Field>
	);
}

export type SelectOption<T extends string> = {
	value: T;
	label: string;
	description?: string | undefined;
	icon?: IconName | undefined;
};

export type SelectSheetProps<T extends string> = {
	label: string;
	value: T | null;
	options: SelectOption<T>[];
	onChange: (value: T) => void;
	placeholder?: string | undefined;
	disabled?: boolean | undefined;
};

/** A field that opens a sheet of options; picking one closes it. */
export function SelectSheet<T extends string>({
	label,
	value,
	options,
	onChange,
	placeholder,
	disabled,
}: SelectSheetProps<T>) {
	const [open, setOpen] = useState(false);
	const selected = options.find((option) => option.value === value);

	return (
		<>
			<ListRow
				title={label}
				subtitle={selected?.label ?? placeholder}
				chevron
				disabled={disabled}
				onPress={() => setOpen(true)}
			/>
			<Sheet open={open} onClose={() => setOpen(false)} title={label}>
				{options.map((option) => (
					<ListRow
						key={option.value}
						title={option.label}
						subtitle={option.description}
						leading={option.icon}
						selected={option.value === value}
						onPress={() => {
							onChange(option.value);
							setOpen(false);
						}}
					/>
				))}
			</Sheet>
		</>
	);
}

export type SwitchProps = {
	value: boolean;
	onValueChange: (value: boolean) => void;
	/** The accessible name when the switch has no visible label next to it. */
	label?: string | undefined;
	disabled?: boolean | undefined;
};

export function Switch({ value, onValueChange, label, disabled }: SwitchProps) {
	const { colors } = useTheme();

	return (
		<NativeSwitch
			accessibilityLabel={label}
			value={value}
			onValueChange={onValueChange}
			disabled={disabled}
			trackColor={{ false: colors.lineStrong, true: colors.accent }}
			thumbColor={colors.onAccent}
		/>
	);
}

export type SegmentedProps<T extends string> = {
	value: T;
	options: { value: T; label: string; icon?: IconName | undefined }[];
	onChange: (value: T) => void;
	/** The accessible name of the group. */
	label?: string | undefined;
};

export function Segmented<T extends string>({ value, options, onChange, label }: SegmentedProps<T>) {
	const { colors, radius, space } = useTheme();

	return (
		<View
			accessibilityRole="tablist"
			accessibilityLabel={label}
			style={{ flexDirection: "row", backgroundColor: colors.sunken, borderRadius: radius.rMd, padding: space.s0 }}
		>
			{options.map((option) => {
				const active = option.value === value;
				return (
					<Pressable
						key={option.value}
						accessibilityRole="tab"
						accessibilityState={{ selected: active }}
						onPress={() => onChange(option.value)}
						style={{
							flex: 1,
							minHeight: 32,
							alignItems: "center",
							justifyContent: "center",
							borderRadius: radius.rMd,
							backgroundColor: active ? colors.raised : "transparent",
						}}
					>
						<Text variant="label" color={active ? "ink" : "ink2"}>
							{option.label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

export type ChipProps = {
	label: string;
	selected?: boolean | undefined;
	onPress?: (() => void) | undefined;
	icon?: IconName | undefined;
	/** Shows a remove button; ChipInput uses it. */
	onRemove?: (() => void) | undefined;
};

export function Chip({ label, selected, onPress, onRemove }: ChipProps) {
	const { t } = useLingui();
	const { colors, radius, size, space } = useTheme();

	return (
		<Pressable
			accessibilityRole={onPress ? "button" : "text"}
			accessibilityState={{ selected: !!selected }}
			accessibilityLabel={label}
			accessibilityActions={onRemove ? [{ name: "delete", label: t`Remove` }] : undefined}
			onAccessibilityAction={onRemove ? () => onRemove() : undefined}
			onPress={onPress}
			onLongPress={onRemove}
			hitSlop={6}
			style={{
				height: size.chip,
				paddingHorizontal: space.s3,
				borderRadius: radius.rPill,
				borderWidth: 1,
				borderColor: selected ? colors.accent : colors.line2,
				backgroundColor: selected ? colors.accentSoft : "transparent",
				justifyContent: "center",
			}}
		>
			<Text variant="callout" color={selected ? "accentText" : "ink2"}>
				{label}
			</Text>
		</Pressable>
	);
}

export type ChipInputProps = {
	label: string;
	values: string[];
	onChange: (values: string[]) => void;
	placeholder?: string | undefined;
	/** Offered while typing; picking one adds it. */
	suggestions?: string[] | undefined;
};

/** Free-text tags: type and press return to add, long-press a chip to remove it. */
export function ChipInput({ label, values, onChange, placeholder }: ChipInputProps) {
	const { space } = useTheme();
	const [draft, setDraft] = useState("");
	const add = () => {
		const value = draft.trim();
		if (value && !values.includes(value)) onChange([...values, value]);
		setDraft("");
	};

	return (
		<View style={{ gap: space.s2 }}>
			<TextField
				label={label}
				value={draft}
				onChangeText={setDraft}
				placeholder={placeholder}
				onSubmitEditing={add}
				submitBehavior="submit"
				returnKeyType="done"
			/>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s1 }}>
				{values.map((value) => (
					<Chip key={value} label={value} onRemove={() => onChange(values.filter((other) => other !== value))} />
				))}
			</View>
		</View>
	);
}
