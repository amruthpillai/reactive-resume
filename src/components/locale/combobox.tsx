import { i18n } from "@lingui/core";
import { useLingui } from "@lingui/react";
import { isLocale, type Locale, loadLocale, localeMap, setLocaleServerFn } from "@/utils/locale";
import { Combobox, type SingleComboboxProps } from "../ui/combobox";

type Props = Omit<SingleComboboxProps, "options" | "value" | "onValueChange">;

export const getLocaleOptions = () => {
	return Object.entries(localeMap).map(([value, label]) => ({
		value: value as Locale,
		label: i18n.t(label),
		keywords: [i18n.t(label)],
	}));
};

export function LocaleCombobox(props: Props) {
	const { i18n } = useLingui();

	const onLocaleChange = async (value: string | null) => {
		if (!value || !isLocale(value)) return;
		await Promise.all([loadLocale(value), setLocaleServerFn({ data: value })]);
		window.location.reload();
	};

	return (
		<Combobox
			showClear={false}
			defaultValue={i18n.locale}
			options={getLocaleOptions()}
			onValueChange={onLocaleChange}
			{...props}
		/>
	);
}
