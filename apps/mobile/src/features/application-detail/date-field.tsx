import { useLingui } from "@lingui/react/macro";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { Button, Text, useTheme } from "@/ui";

type WallClockFieldProps = {
	label: string;
	mode: "date" | "time";
	/** "2026-10-19" for dates, "16:00" for times: a wall clock, read in whatever timezone the caller says. */
	value: string;
	onChange: (value: string) => void;
	error?: string | undefined;
	clearable?: boolean;
	disabled?: boolean;
};

const pad = (value: number) => String(value).padStart(2, "0");

// The picker works on device-local Dates; only their wall-clock fields are read and written.
function toPickerDate(mode: "date" | "time", value: string) {
	const now = new Date();
	if (mode === "date") {
		const [year, month, day] = value.split("-").map(Number);
		return year && month && day ? new Date(year, month - 1, day, 12) : now;
	}
	const [hours, minutes] = value.split(":").map(Number);
	return new Date(2000, 0, 1, hours ?? 9, minutes ?? 0);
}

const fromPickerDate = (mode: "date" | "time", date: Date) =>
	mode === "date"
		? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
		: `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** A date or time field on the system picker: compact inline on iOS, the picker dialog on Android. */
export function WallClockField({ label, mode, value, onChange, error, clearable, disabled }: WallClockFieldProps) {
	const { t, i18n } = useLingui();
	const { colors, radius, size, space } = useTheme();
	const [selection, setSelection] = useState<Date | null>(null);
	const pickerValue = toPickerDate(mode, value);
	const shown = !value
		? mode === "date"
			? t`Choose a date`
			: t`Choose a time`
		: mode === "date"
			? new Intl.DateTimeFormat(i18n.locale, { dateStyle: "medium" }).format(pickerValue)
			: value;

	return (
		<View style={{ gap: space.s1 }}>
			<Text variant="callout" color="ink2">
				{label}
			</Text>
			{Platform.OS === "ios" && (value || selection) ? (
				<View style={{ alignItems: "flex-start" }}>
					<DateTimePicker
						accessibilityLabel={label}
						value={selection ?? pickerValue}
						mode={mode}
						display={selection ? "spinner" : "compact"}
						disabled={!!disabled}
						onChange={(event, date) => {
							if (event.type !== "set" || !date || disabled) return;
							if (selection) setSelection(date);
							else onChange(fromPickerDate(mode, date));
						}}
					/>
					{selection ? (
						<>
							<Button
								label={mode === "date" ? t`Use this date` : t`Use this time`}
								disabled={disabled}
								onPress={() => {
									onChange(fromPickerDate(mode, selection));
									setSelection(null);
								}}
							/>
							<Button label={t`Cancel`} variant="ghost" disabled={disabled} onPress={() => setSelection(null)} />
						</>
					) : null}
				</View>
			) : (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={`${label}, ${shown}`}
					accessibilityState={{ disabled: !!disabled }}
					disabled={disabled}
					onPress={() =>
						Platform.OS === "ios"
							? setSelection(pickerValue)
							: DateTimePickerAndroid.open({
									value: pickerValue,
									mode,
									is24Hour: true,
									onChange: (event, date) => {
										if (event.type === "set" && date && !disabled) onChange(fromPickerDate(mode, date));
									},
								})
					}
					style={{
						minHeight: size.input,
						justifyContent: "center",
						paddingHorizontal: space.s3,
						borderWidth: 1,
						borderRadius: radius.rLg,
						borderColor: error ? colors.danger : colors.lineStrong,
						backgroundColor: colors.raised,
					}}
				>
					<Text variant="bodyLarge" color={value ? "ink" : "ink3"}>
						{shown}
					</Text>
				</Pressable>
			)}
			{clearable && value ? (
				<Button label={t`Clear date`} variant="link" disabled={disabled} onPress={() => onChange("")} />
			) : null}
			{error ? (
				<Text variant="callout" color="dangerText">
					{error}
				</Text>
			) : null}
		</View>
	);
}
