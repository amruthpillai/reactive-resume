import type { Locale } from "@reactive-resume/utils/locale";
import type { SingleComboboxProps } from "@/components/ui/combobox";
import { i18n } from "@lingui/core";
import { useLingui } from "@lingui/react";
import { Combobox } from "@/components/ui/combobox";
import { isLocale, loadLocale, localeMap, setLocaleCookie } from "@/libs/locale";

type Props = Omit<SingleComboboxProps, "options" | "value" | "onValueChange">;

export const getLocaleOptions = () => {
	return Object.entries(localeMap).map(([value, label]) => {
		const name = i18n.t(label);

		return {
			value: value as Locale,
			label: (
				<span className="flex items-center gap-x-2">
					<span className="font-mono text-muted-foreground text-xs">{value}</span>
					{name}
				</span>
			),
			// Shown in the collapsed trigger (a ReactNode label would otherwise fall back to the ISO code).
			textValue: name,
			// Match against the translated name, the ISO code, and the untranslated English name so
			// the list stays searchable regardless of the active UI locale.
			keywords: [name, value.toLowerCase(), label.message].filter((keyword): keyword is string => Boolean(keyword)),
		};
	});
};

export function LocaleCombobox(props: Props) {
	const { i18n } = useLingui();

	const onLocaleChange = async (value: string | null) => {
		if (!value || !isLocale(value)) return;
		setLocaleCookie(value);
		await loadLocale(value);
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
