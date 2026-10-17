import type { IconName } from "@/ui";
import type { KeyboardTypeOptions } from "react-native";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { icons as resumeIcons } from "@reactive-resume/schema/icons";
import { Button, Icon, ListRow, Sheet, Text, TextField, useTheme } from "@/ui";

type PromptSheetProps = {
	open: boolean;
	title: string;
	message?: string | undefined;
	initialValue: string;
	keyboardType?: KeyboardTypeOptions | undefined;
	onClose: () => void;
	onSubmit: (value: string) => void;
};

/** Web's prompt dialog as a sheet: one text field, Cancel and Save. Return saves. */
export function PromptSheet({ open, title, message, initialValue, keyboardType, onClose, onSubmit }: PromptSheetProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const [value, setValue] = useState(initialValue);
	const [shown, setShown] = useState(false);
	// Each opening starts from the current value.
	if (open !== shown) {
		setShown(open);
		if (open) setValue(initialValue);
	}

	return (
		<Sheet open={open} onClose={onClose} title={title}>
			<View style={{ paddingHorizontal: space.s4, gap: space.s3 }}>
				{message ? <Text color="ink2">{message}</Text> : null}
				<TextField
					label={title}
					value={value}
					onChangeText={setValue}
					autoFocus
					selectTextOnFocus
					autoCapitalize={keyboardType === "url" ? "none" : "sentences"}
					keyboardType={keyboardType}
					returnKeyType="done"
					onSubmitEditing={() => onSubmit(value)}
				/>
				<View style={{ flexDirection: "row", justifyContent: "flex-end", gap: space.s2 }}>
					<Button variant="ghost" label={t`Cancel`} onPress={onClose} />
					<Button label={t`Save`} onPress={() => onSubmit(value)} />
				</View>
			</View>
		</Sheet>
	);
}

// The icons the mockup's grid leads with; search covers every icon the page can print.
const SUGGESTED_ICONS: readonly string[] = [
	"briefcase",
	"graduation-cap",
	"graph",
	"lightning",
	"translate",
	"bookmark-simple",
	"check-circle",
	"list-checks",
	"file-text",
	"user-circle",
	"phone",
	"link-simple-horizontal",
	"code",
	"star",
	"globe",
	"envelope-simple",
	"map-pin",
	"calendar-blank",
	"trend-up",
	"sparkle",
	"palette",
] satisfies IconName[];

type IconPickerSheetProps = {
	open: boolean;
	value: string;
	onClose: () => void;
	onChange: (icon: string) => void;
};

/**
 * Section, entry and custom-field icons: None, the common ones, and search over every icon the PDF can draw.
 * ponytail: only the suggested icons (all in the app's icon map) preview a glyph; search results show names. Ship
 * the PDF's Phosphor paths to the app if every glyph must preview.
 */
export function IconPickerSheet({ open, value, onClose, onChange }: IconPickerSheetProps) {
	const { t } = useLingui();
	const { space } = useTheme();
	const [query, setQuery] = useState("");
	const search = query.trim().toLowerCase();
	const names = search
		? resumeIcons.filter((name) => name && name.includes(search)).slice(0, 60)
		: SUGGESTED_ICONS.filter((name) => (resumeIcons as readonly string[]).includes(name));

	return (
		<Sheet open={open} onClose={onClose} title={t`Icon`} detents={[0.6, 1]}>
			<View style={{ paddingHorizontal: space.s4 }}>
				<TextField
					label={t`Search icons`}
					placeholder={t`Search icons`}
					value={query}
					onChangeText={setQuery}
					autoCapitalize="none"
					autoCorrect={false}
				/>
			</View>
			<ListRow title={t`None`} selected={!value} onPress={() => onChange("")} />
			{names.map((name) => (
				<ListRow
					key={name}
					title={name}
					leading={SUGGESTED_ICONS.includes(name) ? <Icon name={name as IconName} size={20} /> : undefined}
					selected={value === name}
					onPress={() => onChange(name)}
				/>
			))}
			{search && names.length === 0 ? (
				<Text color="ink3" style={{ paddingHorizontal: space.s4 }}>{t`No icons match.`}</Text>
			) : null}
		</Sheet>
	);
}

/** Web's 16 colour presets (resume colours, not UI colours). */
export const COLOR_PRESETS = [
	"rgba(0, 0, 0, 1)",
	"rgba(231, 0, 11, 1)",
	"rgba(245, 73, 0, 1)",
	"rgba(225, 113, 0, 1)",
	"rgba(208, 135, 0, 1)",
	"rgba(94, 165, 0, 1)",
	"rgba(0, 166, 62, 1)",
	"rgba(0, 153, 102, 1)",
	"rgba(0, 146, 184, 1)",
	"rgba(0, 132, 209, 1)",
	"rgba(21, 93, 252, 1)",
	"rgba(79, 57, 246, 1)",
	"rgba(127, 34, 254, 1)",
	"rgba(200, 0, 222, 1)",
	"rgba(230, 0, 118, 1)",
	"rgba(69, 85, 108, 1)",
];

const COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/i;

type ColorPickerSheetProps = {
	open: boolean;
	title: string;
	value: string;
	/** Offer "Default" (blank: the template's colour). */
	allowDefault?: boolean | undefined;
	onClose: () => void;
	onChange: (color: string) => void;
};

/** The 16 web presets, then a hex or rgba field (README §1.4: swatches and a hex field). */
export function ColorPickerSheet({ open, title, value, allowDefault, onClose, onChange }: ColorPickerSheetProps) {
	const { t } = useLingui();
	const { colors, radius, size, space } = useTheme();
	const [custom, setCustom] = useState(value);
	const [shown, setShown] = useState(false);
	if (open !== shown) {
		setShown(open);
		if (open) setCustom(value);
	}
	const valid = COLOR.test(custom.trim());

	return (
		<Sheet open={open} onClose={onClose} title={title}>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s2, paddingHorizontal: space.s4 }}>
				{allowDefault ? (
					<Pressable
						accessibilityRole="radio"
						accessibilityLabel={t`Default`}
						accessibilityState={{ checked: !value }}
						onPress={() => onChange("")}
						style={{
							width: size.hit,
							height: size.hit,
							borderRadius: radius.rPill,
							borderWidth: !value ? 3 : 1,
							borderColor: !value ? colors.accent : colors.line2,
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Icon name="x" size={18} />
					</Pressable>
				) : null}
				{COLOR_PRESETS.map((color) => (
					<Pressable
						key={color}
						accessibilityRole="radio"
						accessibilityLabel={color}
						accessibilityState={{ checked: value === color }}
						onPress={() => onChange(color)}
						style={{
							width: size.hit,
							height: size.hit,
							borderRadius: radius.rPill,
							borderWidth: value === color ? 3 : 1,
							borderColor: value === color ? colors.accent : colors.line2,
							backgroundColor: color,
						}}
					/>
				))}
			</View>
			<View style={{ paddingHorizontal: space.s4, gap: space.s2 }}>
				<TextField
					label={t`Custom`}
					placeholder="#1a1a1a"
					value={custom}
					onChangeText={setCustom}
					autoCapitalize="none"
					autoCorrect={false}
					error={custom.trim() && !valid ? t`Enter a hex colour like #1a1a1a, or rgba(…).` : undefined}
				/>
				<Button label={t`Done`} disabled={!valid} onPress={() => onChange(custom.trim())} />
			</View>
		</Sheet>
	);
}

type ColorRowProps = { label: string; value: string; disabled?: boolean | undefined; onPress: () => void };

/** A row that shows a resume colour and opens the picker. */
export function ColorRow({ label, value, disabled, onPress }: ColorRowProps) {
	const { colors, radius, space } = useTheme();
	return (
		<ListRow
			title={label}
			subtitle={value || undefined}
			disabled={disabled}
			onPress={onPress}
			chevron
			leading={
				<View
					style={{
						width: space.s6,
						height: space.s6,
						borderRadius: radius.rPill,
						borderWidth: 1,
						borderColor: colors.line2,
						backgroundColor: value || colors.ink,
					}}
				/>
			}
		/>
	);
}

type NumberFieldProps = {
	label: string;
	value: number;
	min: number;
	max?: number | undefined;
	step: number;
	unit?: string | undefined;
	helper?: string | undefined;
	disabled?: boolean | undefined;
	onChange: (value: number) => void;
};

/** A number with − and + steppers. Typed values save when they read as a number in range. */
export function NumberField({ label, value, min, max, step, unit, helper, disabled, onChange }: NumberFieldProps) {
	const { t } = useLingui();
	const [typed, setTyped] = useState<string | null>(null);
	const clamp = (next: number) => Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, next));
	const round = (next: number) => Math.round(next * 100) / 100;

	return (
		<TextField
			label={unit ? `${label} (${unit})` : label}
			helper={helper}
			value={typed ?? String(value)}
			editable={!disabled}
			keyboardType="decimal-pad"
			onChangeText={(text) => {
				setTyped(text);
				const next = Number(text.replace(",", "."));
				if (text.trim() && Number.isFinite(next) && next === clamp(next)) onChange(next);
			}}
			onBlur={() => setTyped(null)}
			trailing={
				<View style={{ flexDirection: "row" }}>
					<Button
						variant="ghost"
						icon="minus"
						label={t`Less`}
						disabled={disabled || value <= min}
						onPress={() => onChange(round(clamp(value - step)))}
					/>
					<Button
						variant="ghost"
						icon="plus"
						label={t`More`}
						disabled={disabled || (max !== undefined && value >= max)}
						onPress={() => onChange(round(clamp(value + step)))}
					/>
				</View>
			}
		/>
	);
}
