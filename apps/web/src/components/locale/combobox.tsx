import type { SingleComboboxProps } from "@/components/ui/combobox";
import type { Locale } from "@/libs/locale";
import { i18n } from "@lingui/core";
import { useLingui } from "@lingui/react";
import { Combobox } from "@/components/ui/combobox";
import { isLocale, loadLocale, localeMap, setLocaleServerFn } from "@/libs/locale";

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
