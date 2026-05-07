import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { CommandItem } from "@reactive-resume/ui/components/command";
import { isLocale, loadLocale, localeMap, setLocaleServerFn } from "@/libs/locale";
import { BaseCommandGroup } from "../base";

export function LanguageCommandPage() {
	const { i18n } = useLingui();

	const handleLocaleChange = async (value: string) => {
		if (!value || !isLocale(value)) return;
		await Promise.all([loadLocale(value), setLocaleServerFn({ data: value })]);
		window.location.reload();
	};

	return (
		<BaseCommandGroup page="language" heading={<Trans>Language</Trans>}>
			{Object.entries(localeMap).map(([value, label]) => (
				<CommandItem key={value} onSelect={() => handleLocaleChange(value)}>
					<span className="font-mono text-muted-foreground text-xs">{value}</span>
					{i18n.t(label)}
				</CommandItem>
			))}
		</BaseCommandGroup>
	);
}
